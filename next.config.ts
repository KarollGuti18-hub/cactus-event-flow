import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/cloud-confessions",
        destination: "/cloud-and-coffee",
        permanent: true,
      },
      {
        source: "/cloud-confessions/:path*",
        destination: "/cloud-and-coffee/:path*",
        permanent: true,
      },
      {
        source: "/api/cloud-confessions/:path*",
        destination: "/api/cloud-and-coffee/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
