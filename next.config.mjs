/** @type {import('next').NextConfig} */
const nextConfig = {
  // The tour became the cutaway became the four demos. Anything still holding
  // an old URL — stale tabs, history, forwarded links — lands on the right
  // demonstration instead of a 404.
  async redirects() {
    return [
      { source: '/tour', destination: '/', permanent: false },
      { source: '/tour/watch', destination: '/demo/product-search', permanent: false },
      { source: '/tour/try', destination: '/demo/product-search', permanent: false },
      { source: '/tour/understand', destination: '/demo/enquiry-research', permanent: false },
      { source: '/tour/do', destination: '/demo/rfq-processing', permanent: false },
      { source: '/tour/value', destination: '/demo/operations-analysis', permanent: false },
      { source: '/tour/next', destination: '/demo/operations-analysis', permanent: false },
      { source: '/depth', destination: '/', permanent: false },
      { source: '/depth/interior', destination: '/demo/enquiry-research', permanent: false },
      { source: '/depth/workings', destination: '/demo/rfq-processing', permanent: false },
      { source: '/depth/core', destination: '/demo/operations-analysis', permanent: false },
      { source: '/demo', destination: '/', permanent: false },
    ];
  },
  // The catalogue is read through node:sqlite in server components.
  serverExternalPackages: ['node:sqlite'],
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
