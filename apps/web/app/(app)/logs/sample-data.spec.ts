import { apiGet, apiPost } from '../../../lib/api';
import { clearSampleData } from './sample-data';

jest.mock('../../../lib/api', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

describe('clearSampleData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps browser readings and removes only server records marked as demo', async () => {
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
    try {
      expect(await clearSampleData('1234')).toBe(2);
      expect(apiPost).toHaveBeenCalledWith('/logs/reset', { pin: '1234', scope: 'generated' });
      expect(apiGet).not.toHaveBeenCalled();
      expect(storage.getItem).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
      expect(storage.removeItem).not.toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(globalThis, 'window');
    }
  });
});
