const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@complyfood/ui', '@complyfood/shared'],
  experimental: {
    // In a monorepo, trace files from the workspace root so the standalone
    // build bundles everything the server needs.
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  // When API_PROXY_URL is set (e.g. a Tailscale Funnel URL), proxy /api/v1/* to the
  // backend so the browser talks same-origin to app.photonhq.net (no CORS needed).
  async rewrites() {
    const target = process.env.API_PROXY_URL?.replace(/\/+$/, '');
    if (!target) return [];
    return [{ source: '/api/v1/:path*', destination: `${target}/api/v1/:path*` }];
  },
};

module.exports = nextConfig;
