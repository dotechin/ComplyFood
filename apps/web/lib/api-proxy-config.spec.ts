describe('API proxy configuration', () => {
  const originalProxyUrl = process.env.API_PROXY_URL;
  const originalPublicUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    delete process.env.API_PROXY_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  afterEach(() => {
    if (originalProxyUrl === undefined) delete process.env.API_PROXY_URL;
    else process.env.API_PROXY_URL = originalProxyUrl;
    if (originalPublicUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = originalPublicUrl;
    jest.resetModules();
  });

  function loadConfig() {
    let config: { rewrites: () => Promise<{ source: string; destination: string }[]> };
    jest.isolateModules(() => {
      config = require('../next.config');
    });
    return config!;
  }

  it('preserves the default deployment without a proxy', async () => {
    expect(await loadConfig().rewrites()).toEqual([]);
  });

  it('preserves direct browser API access for Funnel', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.example-tailnet.ts.net';
    expect(await loadConfig().rewrites()).toEqual([]);
  });

  it.each(['http://100.64.0.10:4000', 'https://backend.example-tailnet.ts.net/'])(
    'proxies only the API prefix to %s',
    async (origin) => {
      process.env.API_PROXY_URL = origin;
      expect(await loadConfig().rewrites()).toEqual([
        {
          source: '/api/v1/:path*',
          destination: `${origin.replace(/\/$/, '')}/api/v1/:path*`,
        },
      ]);
    },
  );

  it.each([
    'not-a-url',
    'ftp://backend.example-tailnet.ts.net',
    'https://user@backend.example-tailnet.ts.net',
    'https://backend.example-tailnet.ts.net/api/v1',
    'https://backend.example-tailnet.ts.net?token=value',
    'https://backend.example-tailnet.ts.net#fragment',
  ])('rejects an invalid proxy origin: %s', (origin) => {
    process.env.API_PROXY_URL = origin;
    expect(loadConfig).toThrow();
  });

  it('rejects conflicting direct and proxy deployment settings', () => {
    process.env.API_PROXY_URL = 'http://100.64.0.10:4000';
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.example-tailnet.ts.net';
    expect(loadConfig).toThrow('Unset NEXT_PUBLIC_API_URL');
  });

  it('keeps browser API requests same-origin when using the private proxy', () => {
    process.env.API_PROXY_URL = 'https://backend.example-tailnet.ts.net';
    jest.isolateModules(() => {
      const { getApiUrl } = require('./api');
      expect(getApiUrl('/documents')).toBe('/api/v1/documents');
    });
  });

  it('adds exactly one API prefix for direct Funnel requests', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.example-tailnet.ts.net';
    jest.isolateModules(() => {
      const { getApiUrl } = require('./api');
      expect(getApiUrl('/documents')).toBe(
        'https://backend.example-tailnet.ts.net/api/v1/documents',
      );
    });
  });
});
