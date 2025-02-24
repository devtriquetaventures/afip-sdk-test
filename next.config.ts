import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.arca.gob.ar'
      },
    ],
  }
};
export default nextConfig;
