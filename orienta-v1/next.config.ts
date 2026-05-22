import type { NextConfig } from "next";

/**
 * Fase 2 da remocao do perfil "analista": rotas legadas `/analista/*`
 * sao redirecionadas para os equivalentes em `/admin/*` (308 permanente).
 *
 * O workbench "responder por organização" antes estava em
 * `/analista/formularios/[formId]?orgId=...` (com a hub em
 * `/analista/formularios`). Agora vive em `/admin/responder/[formId]`
 * (hub em `/admin/responder`); as demais sub-rotas de
 * `/analista/formularios/[formId]/*` (configuracao, perguntas, respostas,
 * vinculos) seguem o espelho normal em `/admin/formularios/[formId]/*`.
 *
 * Ordem importa: regras mais especificas primeiro, catch-all por ultimo.
 * Sera removido em conjunto com o role na Fase 3.
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
        destination: "/admin/responder/:formId",
        permanent: true,
      },
      {
        source: "/analista/formularios",
        destination: "/admin/responder",
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
