import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'gateway.pinata.cloud', pathname: '/ipfs/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'source.unsplash.com', pathname: '/**' },
    ],
  },
  webpack: (config) => {
    // pnpm/npm: @solana/kit resolves @solana/accounts to kit/node_modules/@solana/accounts which may not exist.
    // Force resolution to project root node_modules so the build finds the file.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@solana/accounts": path.resolve(__dirname, "node_modules/@solana/accounts"),
    };
    return config;
  },
};

export default nextConfig;
