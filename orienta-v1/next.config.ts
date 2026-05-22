import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/respondente/complementacoes",
        destination: "/respondente/evidencias-complementacoes",
        permanent: true,
      },
      {
        source: "/admin/complementacoes",
        destination: "/admin/evidencias?status=complementation_requested",
        permanent: true,
      },
      {
        source: "/analista/complementacoes",
        destination: "/analista/evidencias?status=complementation_requested",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
