import { DocumentCategory, type Document } from '@complyfood/shared';
import {
  NOT_A_PDF_MESSAGE,
  PREVIEW_ERROR_MESSAGE,
  UNSUPPORTED_TYPE_MESSAGE,
  createPreviewController,
  hasPdfSignature,
} from './preview';

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

// The API delivers stored bytes; an image-only (scanned) PDF has no text layer at all.
const scannedPdf = () => new Blob(['%PDF-1.4\n1 0 obj << /Type /XObject /Subtype /Image >> stream\n\xff\xd8\xff endstream'], { type: 'application/octet-stream' });
const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup() {
  let counter = 0;
  const deps = {
    fetchBlob: jest.fn<Promise<Blob>, [string, AbortSignal]>(),
    createObjectURL: jest.fn((_blob: Blob) => `blob:preview-${++counter}`),
    revokeObjectURL: jest.fn<void, [string]>(),
  };
  return { deps, preview: createPreviewController(deps) };
}

describe('hasPdfSignature', () => {
  it('detects PDF headers, including ones preceded by junk bytes', async () => {
    expect(await hasPdfSignature(new Blob(['%PDF-1.7']))).toBe(true);
    expect(await hasPdfSignature(new Blob(['\n\n  %PDF-1.3']))).toBe(true);
    expect(await hasPdfSignature(new Blob(['<html><script>alert(1)</script>']))).toBe(false);
  });
});

describe('createPreviewController', () => {
  it('shows the original stored bytes as an application/pdf object URL without downloading', async () => {
    const { deps, preview } = setup();
    deps.fetchBlob.mockResolvedValue(scannedPdf());

    await preview.show(makeDoc('scan'));

    expect(deps.fetchBlob).toHaveBeenCalledTimes(1);
    expect(deps.fetchBlob).toHaveBeenCalledWith('/documents/scan/download', expect.any(AbortSignal));
    const blob = deps.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBe(scannedPdf().size);
    expect(preview.getState()).toMatchObject({ status: 'ready', url: 'blob:preview-1', doc: { id: 'scan' } });
  });

  it('recognizes PDFs by extension when the stored MIME type is missing', async () => {
    const { deps, preview } = setup();
    deps.fetchBlob.mockResolvedValue(scannedPdf());
    await preview.show(makeDoc('legacy', { mimeType: null, name: 'Legacy.PDF' }));
    expect(preview.getState().status).toBe('ready');
  });

  it('offers an explicit fallback for unsupported types without fetching them', async () => {
    const { deps, preview } = setup();
    await preview.show(makeDoc('layout', { name: 'layout.svg', mimeType: 'image/svg+xml' }));

    expect(deps.fetchBlob).not.toHaveBeenCalled();
    expect(deps.createObjectURL).not.toHaveBeenCalled();
    expect(preview.getState()).toMatchObject({ status: 'unsupported', message: UNSUPPORTED_TYPE_MESSAGE });
  });

  it('refuses to render bytes that are not really a PDF', async () => {
    const { deps, preview } = setup();
    deps.fetchBlob.mockResolvedValue(new Blob(['<html><script>alert(1)</script></html>'], { type: 'text/html' }));

    await preview.show(makeDoc('fake'));

    expect(deps.createObjectURL).not.toHaveBeenCalled();
    expect(preview.getState()).toMatchObject({ status: 'unsupported', message: NOT_A_PDF_MESSAGE });
  });

  it('reports fetch failures and allows retrying', async () => {
    const { deps, preview } = setup();
    deps.fetchBlob.mockRejectedValueOnce(new Error('Document not found')).mockResolvedValueOnce(scannedPdf());

    await preview.show(makeDoc('a'));
    expect(preview.getState()).toMatchObject({ status: 'error', message: PREVIEW_ERROR_MESSAGE });

    await preview.show(makeDoc('a'));
    expect(preview.getState().status).toBe('ready');
  });

  it('ignores repeated clicks on the document being shown', async () => {
    const { deps, preview } = setup();
    const pending = deferred<Blob>();
    deps.fetchBlob.mockReturnValue(pending.promise);

    const first = preview.show(makeDoc('a'));
    void preview.show(makeDoc('a'));
    pending.resolve(scannedPdf());
    await first;
    await preview.show(makeDoc('a'));

    expect(deps.fetchBlob).toHaveBeenCalledTimes(1);
    expect(deps.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('discards stale preview responses when another document is shown', async () => {
    const { deps, preview } = setup();
    const slow = deferred<Blob>();
    deps.fetchBlob.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(scannedPdf());

    const first = preview.show(makeDoc('a'));
    const signal = deps.fetchBlob.mock.calls[0][1];
    await preview.show(makeDoc('b'));
    slow.resolve(scannedPdf());
    await first;

    expect(signal.aborted).toBe(true);
    expect(deps.createObjectURL).toHaveBeenCalledTimes(1);
    expect(preview.getState()).toMatchObject({ status: 'ready', doc: { id: 'b' } });
  });

  it('revokes the previous object URL when switching documents', async () => {
    const { deps, preview } = setup();
    deps.fetchBlob.mockResolvedValue(scannedPdf());

    await preview.show(makeDoc('a'));
    await preview.show(makeDoc('b'));

    expect(deps.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
    expect(deps.revokeObjectURL).not.toHaveBeenCalledWith('blob:preview-2');
  });

  it('revokes the object URL on close and ignores responses that arrive after closing', async () => {
    const { deps, preview } = setup();
    deps.fetchBlob.mockResolvedValueOnce(scannedPdf());
    await preview.show(makeDoc('a'));
    preview.close();
    expect(deps.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
    expect(preview.getState().status).toBe('idle');

    const late = deferred<Blob>();
    deps.fetchBlob.mockReturnValueOnce(late.promise);
    const pending = preview.show(makeDoc('b'));
    preview.close();
    late.resolve(scannedPdf());
    await pending;
    await flush();
    expect(deps.createObjectURL).toHaveBeenCalledTimes(1);
    expect(preview.getState().status).toBe('idle');
  });

  it('closes the preview when the shown document is deleted', async () => {
    const { deps, preview } = setup();
    deps.fetchBlob.mockResolvedValue(scannedPdf());
    await preview.show(makeDoc('a'));

    preview.handleDeleted('other');
    expect(preview.getState().status).toBe('ready');
    preview.handleDeleted('a');
    expect(preview.getState().status).toBe('idle');
    expect(deps.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
  });

  it('cleans up on dispose (unmount)', async () => {
    const { deps, preview } = setup();
    deps.fetchBlob.mockResolvedValue(scannedPdf());
    await preview.show(makeDoc('a'));
    const listener = jest.fn();
    preview.subscribe(listener);

    preview.dispose();
    await preview.show(makeDoc('b'));

    expect(deps.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
    expect(deps.fetchBlob).toHaveBeenCalledTimes(1);
  });
});
