import type { NextConfig } from "next";

/**
 * Rotas legadas `/analista/*` redirecionam para `/admin/*` (308 permanente).
 * Ordem: regras mais especificas primeiro, catch-all por ultimo.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/analista/formularios/novo",
        destination: "/admin/formularios/novo",
        permanent: true,
      },
      {
        source: "/analista/formularios/:formId/configuracao",
        destination: "/admin/formularios/:formId/configuracao",
        permanent: true,
      },
      {
        source: "/analista/formularios/:formId/perguntas",
        destination: "/admin/formularios/:formId/perguntas",
        permanent: true,
      },
      {
        source: "/analista/formularios/:formId/respostas",
        destination: "/admin/formularios/:formId/respostas",
        permanent: true,
      },
      {
        source: "/analista/formularios/:formId/vinculos",
        destination: "/admin/formularios/:formId/vinculos",
        permanent: true,
      },
      {
        source: "/analista/formularios/:formId",
        destination: "/admin/formularios/:formId",
        permanent: true,
      },
      {
        source: "/analista/formularios",
        destination: "/admin/formularios",
        permanent: true,
      },
      {
        source: "/analista",
        destination: "/admin",
        permanent: true,
      },
      {
        source: "/analista/:path*",
        destination: "/admin/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
