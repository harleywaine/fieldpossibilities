/** @type {import('next').NextConfig} */
const nextConfig = {
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
