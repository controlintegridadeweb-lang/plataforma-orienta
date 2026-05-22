"use client";

export type EntitySubscriptionOptions = {
  organizationId: string | null;
  /** Nomes lógicos de tabela (`evidences`, `evidence_validations`, …) para documentação futura. */
  tables?: string[];
  enabled?: boolean;
};

/**
 * Stub para futura integração com Supabase Realtime (`postgres_changes` ou broadcast).
 *
 * Pontos de integração sugeridos (sem criar tabelas novas aqui):
 * - Canal por organização: `supabase.channel(\`org:${organizationId}\`)` com filtro
 *   `schema=public` e `table=in (...)` conforme políticas RLS permitirem leitura.
 * - Após evento: preferir `router.refresh()` (Server Components), `revalidatePath`
 *   em Server Actions, ou invalidação explícita dos fetchers client usados nas shells.
 * - Onde latência < Realtime for aceitável, `router.refresh()` disparado por foco na aba
 *   complementa sem sobrecarregar o projeto com polling global.
 *
 * Implementação real deve respeitar permissões por perfil e não expor `service_role` no cliente.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- API reservada até Realtime ser ligado
export function useEntitySubscription(_options: EntitySubscriptionOptions): void {
  // Intencionalmente vazio nesta iteração — substituir por subscribe quando o contrato de canal estiver definido.
}
