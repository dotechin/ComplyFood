import { DocumentCategory, type Document } from '@complyfood/shared';
import { LIST_ERROR_MESSAGE, createDocumentLibrary, type LibraryDeps } from './library';

function makeDoc(id: string, overrides: Partial<Document> = {}): Document {
  return {
    id,
    orgId: 'org-1',
    name: `${id}.pdf`,
    s3Key: `org-1/${id}.pdf`,
    category: DocumentCategory.GENERAL,
    notes: null,
    linkedEntryId: null,
    uploadedBy: 'user-1',
    mimeType: 'application/pdf',
    metadata: null,
    processingStatus: 'completed',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
const ids = (docs: Document[]) => docs.map((doc) => doc.id);
const file = (name: string) => ({ name }) as File;
const form = () => ({}) as FormData;

const created: Array<{ dispose: () => void }> = [];

function setup(options: Pick<LibraryDeps, 'now' | 'pollIntervalMs' | 'maxPolls'> = {}) {
  const deps = {
    list: jest.fn<Promise<Document[]>, [AbortSignal]>(),
    upload: jest.fn<Promise<Document>, [FormData]>(),
    remove: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
  };
  const library = createDocumentLibrary({ ...deps, ...options });
  created.push(library);
  return { deps, library };
}

describe('createDocumentLibrary', () => {
  afterEach(() => {
    created.splice(0).forEach((library) => library.dispose());
    jest.useRealTimers();
  });

  it('loads the list and notifies subscribers', async () => {
    const { deps, library } = setup();
    deps.list.mockResolvedValue([makeDoc('a')]);
    const listener = jest.fn();
    library.subscribe(listener);

    expect(library.getState().status).toBe('loading');
    await library.refresh();

    expect(library.getState()).toMatchObject({ status: 'ready', error: '', refreshing: false });
    expect(ids(library.getState().docs)).toEqual(['a']);
    expect(listener).toHaveBeenCalled();
  });

  it('lets the latest list request win and aborts superseded requests', async () => {
    const { deps, library } = setup();
    const slow = deferred<Document[]>();
    const signals: AbortSignal[] = [];
    deps.list
      .mockImplementationOnce((signal) => { signals.push(signal); return slow.promise; })
      .mockImplementationOnce((signal) => { signals.push(signal); return Promise.resolve([makeDoc('fresh')]); });

    const first = library.refresh();
    await library.refresh();
    slow.resolve([makeDoc('stale')]);
    await first;

    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    expect(ids(library.getState().docs)).toEqual(['fresh']);
  });

  it('removes deleted documents immediately and never lets an older response restore them', async () => {
    const { deps, library } = setup();
    deps.list.mockResolvedValueOnce([makeDoc('a'), makeDoc('b')]);
    await library.refresh();

    // A list request that started before the delete finishes after it.
    const stale = deferred<Document[]>();
    deps.list.mockReturnValueOnce(stale.promise);
    const pending = library.refresh();
    const followUp = deferred<Document[]>();
    deps.list.mockReturnValueOnce(followUp.promise);

    await library.remove('a');
    expect(deps.remove).toHaveBeenCalledWith('a');
    expect(ids(library.getState().docs)).toEqual(['b']);

    stale.resolve([makeDoc('a'), makeDoc('b')]);
    await pending;
    followUp.resolve([makeDoc('a'), makeDoc('b')]);
    await flush();
    expect(ids(library.getState().docs)).toEqual(['b']);
  });

  it('keeps the row and rethrows when deletion fails', async () => {
    const { deps, library } = setup();
    deps.remove.mockRejectedValue(new Error('Forbidden'));
    deps.list.mockResolvedValue([makeDoc('a')]);
    await library.refresh();

    await expect(library.remove('a')).rejects.toThrow('Forbidden');
    expect(ids(library.getState().docs)).toEqual(['a']);
  });

  it('shows uploads immediately, reports partial failures and refetches afterwards', async () => {
    const { deps, library } = setup();
    deps.list.mockResolvedValueOnce([makeDoc('old')]);
    await library.refresh();

    const uploadedDoc = makeDoc('new', { createdAt: '2026-02-01T00:00:00.000Z', processingStatus: 'pending' });
    deps.upload.mockResolvedValueOnce(uploadedDoc).mockRejectedValueOnce(new Error('too large'));
    deps.list.mockResolvedValueOnce([uploadedDoc, makeDoc('old')]);
    const listener = jest.fn(() => ids(library.getState().docs));
    library.subscribe(listener);

    const result = await library.upload([file('new.pdf'), file('huge.pdf')], form);

    expect(result.uploaded).toEqual([uploadedDoc]);
    expect(result.failed).toEqual(['huge.pdf']);
    // The new row is visible before the confirming refetch resolves.
    expect(listener.mock.results.some((r) => JSON.stringify(r.value) === JSON.stringify(['new', 'old']))).toBe(true);
    await flush();
    expect(deps.list).toHaveBeenCalledTimes(2);
    expect(ids(library.getState().docs)).toEqual(['new', 'old']);
  });

  it('does not drop an upload when a refresh that started before it resolves later', async () => {
    const { deps, library } = setup();
    deps.list.mockResolvedValueOnce([]);
    await library.refresh();

    const firstUpload = deferred<Document>();
    const secondUpload = deferred<Document>();
    deps.upload.mockReturnValueOnce(firstUpload.promise).mockReturnValueOnce(secondUpload.promise);
    const uploading = library.upload([file('a.pdf'), file('b.pdf')], form);

    // e.g. a focus refetch issued while the first file is still uploading
    const snapshot = deferred<Document[]>();
    deps.list.mockReturnValueOnce(snapshot.promise);
    const focusRefresh = library.refresh();

    firstUpload.resolve(makeDoc('a'));
    await flush();
    snapshot.resolve([]);
    await focusRefresh;
    expect(ids(library.getState().docs)).toEqual(['a']);

    deps.list.mockResolvedValueOnce([makeDoc('a'), makeDoc('b')]);
    secondUpload.resolve(makeDoc('b'));
    await uploading;
    await flush();
    expect(ids(library.getState().docs).sort()).toEqual(['a', 'b']);
  });

  it('trusts newer server snapshots that no longer contain an upload', async () => {
    const { deps, library } = setup();
    deps.list.mockResolvedValueOnce([]);
    await library.refresh();
    deps.upload.mockResolvedValueOnce(makeDoc('gone'));
    deps.list.mockResolvedValueOnce([]);

    await library.upload([file('gone.pdf')], form);
    await flush();
    expect(ids(library.getState().docs)).toEqual([]);
  });

  it('reports an initial load failure and recovers on retry', async () => {
    const { deps, library } = setup();
    deps.list.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([makeDoc('a')]);

    await library.refresh();
    expect(library.getState()).toMatchObject({ status: 'error', error: LIST_ERROR_MESSAGE, refreshing: false });

    await library.refresh();
    expect(library.getState()).toMatchObject({ status: 'ready', error: '' });
    expect(ids(library.getState().docs)).toEqual(['a']);
  });

  it('keeps the last good list when a later refresh fails', async () => {
    const { deps, library } = setup();
    deps.list.mockResolvedValueOnce([makeDoc('a')]).mockRejectedValueOnce(new Error('offline'));
    await library.refresh();
    await library.refresh();

    expect(library.getState()).toMatchObject({ status: 'ready', error: LIST_ERROR_MESSAGE });
    expect(ids(library.getState().docs)).toEqual(['a']);
  });

  it('only refetches on focus when the list is stale', async () => {
    let now = 1_000;
    const { deps, library } = setup({ now: () => now });
    deps.list.mockResolvedValue([makeDoc('a')]);
    await library.refresh();

    expect(library.refreshIfStale(5_000)).toBeUndefined();
    now += 5_001;
    await library.refreshIfStale(5_000);
    expect(deps.list).toHaveBeenCalledTimes(2);
  });

  it('polls while PDFs are pending, with a bounded number of attempts', async () => {
    jest.useFakeTimers();
    const { deps, library } = setup({ pollIntervalMs: 1_000, maxPolls: 2 });
    deps.list.mockResolvedValue([makeDoc('a', { processingStatus: 'pending' })]);

    await library.refresh();
    expect(deps.list).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1_000);
    expect(deps.list).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1_000);
    expect(deps.list).toHaveBeenCalledTimes(3);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(deps.list).toHaveBeenCalledTimes(3);
  });

  it('keeps polling pending PDFs after a transient refresh failure', async () => {
    jest.useFakeTimers();
    const { deps, library } = setup({ pollIntervalMs: 1_000, maxPolls: 5 });
    deps.list
      .mockResolvedValueOnce([makeDoc('a', { processingStatus: 'pending' })])
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([makeDoc('a', { processingStatus: 'completed' })]);

    await library.refresh();
    await jest.advanceTimersByTimeAsync(1_000);
    expect(library.getState().error).toBe(LIST_ERROR_MESSAGE);
    await jest.advanceTimersByTimeAsync(1_000);
    expect(library.getState()).toMatchObject({ error: '', docs: [expect.objectContaining({ processingStatus: 'completed' })] });
  });

  it('stops polling once processing completes', async () => {
    jest.useFakeTimers();
    const { deps, library } = setup({ pollIntervalMs: 1_000 });
    deps.list
      .mockResolvedValueOnce([makeDoc('a', { processingStatus: 'pending' })])
      .mockResolvedValue([makeDoc('a', { processingStatus: 'completed', metadata: { title: null, author: null, creationDate: null, pageCount: 3 } })]);

    await library.refresh();
    await jest.advanceTimersByTimeAsync(1_000);
    expect(library.getState().docs[0].processingStatus).toBe('completed');
    await jest.advanceTimersByTimeAsync(10_000);
    expect(deps.list).toHaveBeenCalledTimes(2);
  });

  it('cancels polling and in-flight requests on dispose', async () => {
    jest.useFakeTimers();
    const { deps, library } = setup({ pollIntervalMs: 1_000 });
    deps.list.mockResolvedValueOnce([makeDoc('a', { processingStatus: 'pending' })]);
    await library.refresh();

    library.dispose();
    await jest.advanceTimersByTimeAsync(10_000);
    expect(deps.list).toHaveBeenCalledTimes(1);
  });
});
