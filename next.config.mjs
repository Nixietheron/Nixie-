import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Base Account uses a popup for some flows; `same-origin` can break it.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'gateway.pinata.cloud', pathname: '/ipfs/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'source.unsplash.com', pathname: '/**' },
    ],
  },
  webpack: (config) => {
    // Vercel: use npm (vercel.json installCommand). With pnpm, @solana/accounts can be missing in nested resolution.
    // Only alias if needed; do not alias @solana/errors or codecs-core (CDP SDK needs nested 5.x).
    const root = path.resolve(__dirname, "node_modules");
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": path.join(__dirname, "lib/stubs/async-storage.js"),
      "@solana/accounts": path.join(root, "@solana/accounts"),
      "@solana/addresses": path.join(root, "@solana/addresses"),
    };
    return config;
  },
};

export default nextConfig;
