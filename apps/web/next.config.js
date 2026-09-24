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
};

module.exports = nextConfig;
