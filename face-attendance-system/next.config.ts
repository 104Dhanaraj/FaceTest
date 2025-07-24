import type { NextConfig } from "next";
import type { Configuration } from "webpack";

// Enable HTTPS and listen on all interfaces for mobile access in dev
const nextConfig: NextConfig = {
  // Listen on all interfaces
  devServer: {
    host: '0.0.0.0',
    // If using custom HTTPS certs, add them here
    // https: true,
  },
};
module.exports = {
  webpack: (config: Configuration) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = { fs: false }
    return config
  },
}

export default nextConfig;
