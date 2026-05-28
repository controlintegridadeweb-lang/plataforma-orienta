import type { StaffAreaPrefix } from "@/lib/admin/queue-links";

/** Prefixo de rota staff — sempre `/admin`. */
export function staffAreaFromPathname(): StaffAreaPrefix {
  return "admin";
}

export function useStaffArea(): StaffAreaPrefix {
  return "admin";
}

export function staffPath(
  area: StaffAreaPrefix,
  segment: string,
  query?: Record<string, string | undefined>,
): string {
  const base = `/${area}/${segment}`;
  if (!query) return base;
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v) u.set(k, v);
  }
  const q = u.toString();
  return q ? `${base}?${q}` : base;
}

export type StaffPlanoAcaoDetailSection = "visao-geral" | "acoes" | "monitoramento";

/** Página completa do plano de ação (workspace de supervisão). */
export function staffPlanoAcaoDetailHref(
  area: StaffAreaPrefix,
  recommendationId: string,
  section: StaffPlanoAcaoDetailSection = "visao-geral",
): string {
  return `/${area}/plano-acao/${recommendationId}/${section}`;
}

/** Atalho para o detalhe do plano — abre na Visão geral por padrão. */
export function staffPlanoAcaoHref(
  area: StaffAreaPrefix,
  recommendationId: string,
): string {
  return staffPlanoAcaoDetailHref(area, recommendationId, "visao-geral");
}

export function staffRecomendacoesHref(
  area: StaffAreaPrefix,
  recommendationId: string,
): string {
  return `/${area}/recomendacoes/${recommendationId}/visao-geral`;
}
