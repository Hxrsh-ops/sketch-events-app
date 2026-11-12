import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: [
    "192.168.1.14",
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.io",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
