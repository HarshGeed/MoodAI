import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Ignore optional Apollo Server dependencies that cause build issues
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@yaacovcr/transform': false,
      };
      // Ignore the module entirely
      config.resolve.alias = {
        ...config.resolve.alias,
        '@yaacovcr/transform': false,
      };
    }
    return config;
  },
  // Suppress the _document warning
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
