/**
 * Normaliza titulos e descricoes vindos do workbench / staging para copy
 * amigavel em PT-BR na fila de evidencias.
 */
export function normalizeWorkbenchText(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized === "evidence registered by workbench") {
    return "Evidencia registrada pela Area de Trabalho";
  }
  if (normalized === "evidencia registrada pelo workbench") {
    return "Evidencia registrada pela Area de Trabalho";
  }
  if (normalized === "evidencia registrada pela area de trabalho") {
    return "Evidencia registrada pela Area de Trabalho";
  }
  if (normalized === "automated record for validation flow") {
    return "Registro automatizado para fluxo de validacao";
  }
  if (normalized === "automated record for validation flow in staging") {
    return "Registro automatizado para fluxo de validacao em homologacao";
  }
  if (normalized === "validation logged in workbench") {
    return "Validacao registrada na Area de Trabalho";
  }
  if (normalized === "validacao registrada no workbench") {
    return "Validacao registrada na Area de Trabalho";
  }
  if (normalized === "validation in staging environment") {
    return "Validacao em ambiente de homologacao";
  }
  return value;
}
