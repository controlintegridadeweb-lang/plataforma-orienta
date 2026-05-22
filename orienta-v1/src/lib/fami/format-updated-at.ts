/** Exibição amigável da última atualização da pontuação FAMI. */
export function formatFamiUpdatedAt(iso: string | null | undefined): string {
  if (!iso) return "Ainda não calculada para este escopo";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
