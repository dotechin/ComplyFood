const path = require('path');

const apiProxyUrl = process.env.API_PROXY_URL;
let apiProxyOrigin;
if (apiProxyUrl) {
  const url = new URL(apiProxyUrl);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('API_PROXY_URL must be an HTTP(S) origin without credentials, path, query, or fragment');
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    throw new Error('Unset NEXT_PUBLIC_API_URL when using API_PROXY_URL');
  }
  apiProxyOrigin = url.origin;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@complyfood/ui', '@complyfood/shared'],
  experimental: {
    // In a monorepo, trace files from the workspace root so the standalone
    // build bundles everything the server needs.
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  async rewrites() {
    return apiProxyOrigin
      ? [{ source: '/api/v1/:path*', destination: `${apiProxyOrigin}/api/v1/:path*` }]
      : [];
  },
};

module.exports = nextConfig;
