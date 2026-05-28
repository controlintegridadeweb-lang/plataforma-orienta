/**
 * URL publica do app para redirects de auth (recuperacao de senha, etc.).
 * Prioridade: Origin da requisicao > NEXT_PUBLIC_APP_URL > URL da Vercel > localhost.
 */
export function resolveAppOrigin(requestOrigin?: string | null): string {
  const fromHeader = requestOrigin?.trim();
  if (fromHeader) {
    return normalizeOrigin(fromHeader);
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return normalizeOrigin(configured);
  }

  const vercelHost =
    process.env.VERCEL_BRANCH_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (vercelHost) {
    const host = vercelHost.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}

function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
