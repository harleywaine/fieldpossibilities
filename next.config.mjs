/** @type {import('next').NextConfig} */
const nextConfig = {
  // The six-chapter tour became the cutaway. Anything still holding an old
  // tour URL — stale tabs, history, forwarded links — lands on the nearest
  // stratum instead of a 404.
  async redirects() {
    return [
      { source: '/tour', destination: '/', permanent: false },
      { source: '/tour/watch', destination: '/', permanent: false },
      { source: '/tour/try', destination: '/', permanent: false },
      { source: '/tour/understand', destination: '/depth/interior', permanent: false },
      { source: '/tour/do', destination: '/depth/workings', permanent: false },
      { source: '/tour/value', destination: '/depth/core', permanent: false },
      { source: '/tour/next', destination: '/depth/core', permanent: false },
      { source: '/depth', destination: '/', permanent: false },
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
