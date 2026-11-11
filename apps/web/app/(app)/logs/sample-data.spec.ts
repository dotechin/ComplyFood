import { apiDelete, apiGet, apiPost } from '../../../lib/api';
import { clearSampleData } from './sample-data';

jest.mock('../../../lib/api', () => ({
  apiDelete: jest.fn(),
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

describe('clearSampleData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps browser readings and historical records while removing marked server samples', async () => {
    const storage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: storage },
    });
    jest.mocked(apiPost).mockResolvedValue({ deleted: 2 });
    jest.mocked(apiGet)
      .mockResolvedValueOnce([
        { id: 'legacy', fields: { 'Sample data': 'yes' } },
        { id: 'historical', fields: { 'Sample data': 'yes' }, recordOrigin: 'historical_transcription' },
        { id: 'source', fields: { 'Sample data': 'yes' }, sourceDocumentId: 'document' },
      ])
      .mockResolvedValue([]);
    jest.mocked(apiDelete).mockResolvedValue(undefined);

    try {
      expect(await clearSampleData('1234')).toBe(3);
      expect(apiDelete).toHaveBeenCalledTimes(1);
      expect(apiDelete).toHaveBeenCalledWith('/logs/legacy');
      expect(storage.getItem).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
      expect(storage.removeItem).not.toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(globalThis, 'window');
    }
  });
});
