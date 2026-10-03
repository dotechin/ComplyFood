import { DOWNLOAD_URL_REVOKE_DELAY_MS, apiDownload, apiFetchBlob, apiGet } from './api';

const TEST_TOKEN = 'test-token';
const EXPECTED_AUTH = ['Bearer', TEST_TOKEN].join(' ');

describe('api helpers', () => {
  const fetchMock = jest.fn();
  const createObjectURL = jest.fn(() => 'blob:download-1');
  const revokeObjectURL = jest.fn();
  let link: { href: string; download: string; rel: string; style: Record<string, string>; click: jest.Mock; remove: jest.Mock };
  const g = globalThis as Record<string, unknown>;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    link = { href: '', download: '', rel: '', style: {}, click: jest.fn(), remove: jest.fn() };
    g.fetch = fetchMock;
    g.localStorage = { getItem: jest.fn(() => TEST_TOKEN) };
    g.window = { URL: { createObjectURL, revokeObjectURL }, setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) };
    g.document = { cookie: '', createElement: jest.fn(() => link), body: { appendChild: jest.fn() } };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete g.window;
    delete g.document;
    delete g.localStorage;
  });

  it('keeps apiGet backwards compatible while allowing abort signals and cache policy', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    await apiGet('/documents');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'include' });
    expect(fetchMock.mock.calls[0][1].cache).toBeUndefined();

    const controller = new AbortController();
    await apiGet('/documents', { signal: controller.signal, cache: 'no-store' });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'GET', signal: controller.signal, cache: 'no-store', headers: { Authorization: EXPECTED_AUTH },
    });
  });

  it('fetches blobs with the bearer token and without HTTP caching', async () => {
    const blob = new Blob(['%PDF-1.4']);
    fetchMock.mockResolvedValue({ ok: true, blob: async () => blob });
    const controller = new AbortController();

    await expect(apiFetchBlob('/documents/doc-1/download', { signal: controller.signal })).resolves.toBe(blob);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/documents/doc-1/download', {
      method: 'GET',
      headers: { Authorization: EXPECTED_AUTH },
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    });
  });

  it('surfaces API error messages for blob requests', async () => {
    fetchMock.mockResolvedValue({ ok: false, statusText: 'Bad Request', json: async () => ({ message: 'Document not found' }) });
    await expect(apiFetchBlob('/documents/x/download')).rejects.toThrow('Document not found');
  });

  it('downloads with the original file name and revokes the URL only after the save starts', async () => {
    fetchMock.mockResolvedValue({ ok: true, blob: async () => new Blob(['%PDF-1.4']) });

    await apiDownload('/documents/doc-1/download', 'Fire permit 2026.pdf');

    expect(link.download).toBe('Fire permit 2026.pdf');
    expect(link.href).toBe('blob:download-1');
    expect(link.click).toHaveBeenCalledTimes(1);
    expect(link.remove).toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    jest.advanceTimersByTime(DOWNLOAD_URL_REVOKE_DELAY_MS);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download-1');
  });
});
