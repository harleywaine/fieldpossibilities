/** @type {import('next').NextConfig} */
const nextConfig = {
  // Everything before the enquiry journey has been retired. Stale tabs,
  // history and forwarded links land on the journey instead of a 404.
  async redirects() {
    return [
      '/tour', '/tour/:path*', '/depth', '/depth/:path*', '/demo', '/demo/:path*', '/demos',
      '/explore', '/customer-ai', '/knowledge-ai', '/workflow-ai', '/operating-layer',
      '/search', '/catalogue', '/compare', '/product/:path*', '/requests', '/requests/:path*',
      '/roi', '/architecture', '/ingestion',
    ].map((source) => ({ source, destination: '/', permanent: false }));
  },
  // The catalogue is read through node:sqlite in server components.
  serverExternalPackages: ['node:sqlite'],
  // The databases are opened by path at runtime, which tracing can't follow;
  // name them so every serverless function ships with them.
  outputFileTracingIncludes: {
    '/**': ['./data/catalogue/catalogue.db', './data/catalogue/metadata.json', './data/demo/demo.db'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.fieldinternational.com' },
    ],
  },
  // Ingestion modules are run directly by Node (which requires explicit .ts
  // specifiers), so the bundler is taught the same resolution.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.ts': ['.ts', '.tsx'],
      '.js': ['.js', '.ts', '.tsx'],
    };
    return config;
  },
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
};

export default nextConfig;
