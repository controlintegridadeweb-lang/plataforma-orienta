import { notify } from "@/lib/notify";

type ApiErrorBody = { error?: string };

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new Error("Resposta inválida do servidor.");
  }
}

function formatError(payload: ApiErrorBody | undefined, fallback: string): string {
  return typeof payload?.error === "string" ? payload.error : fallback;
}

export type ReportOrganizationOption = { id: string; name: string };
export type ReportFormOption = {
  id: string;
  name: string;
  version: number;
  latestProcessingVersion: number;
};

export type ReportOptionsResult = {
  organizations: ReportOrganizationOption[];
  forms: ReportFormOption[];
};

export async function loadReportOptions(
  organizationId?: string,
): Promise<ReportOptionsResult> {
  const qs = organizationId
    ? `?organizationId=${encodeURIComponent(organizationId)}`
    : "";
  const res = await fetch(`/api/reports/options${qs}`, { credentials: "include" });
  const payload = await parseJson<ReportOptionsResult & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(formatError(payload, "Falha ao carregar escopo."));
  }
  return {
    organizations: payload.organizations ?? [],
    forms: payload.forms ?? [],
  };
}

export async function generateOfficialReportPdf(payload: {
  formId: string;
  organizationId: string;
  processingVersion?: number;
}): Promise<Blob> {
  const res = await fetch("/api/reports/official", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const j = await parseJson<ApiErrorBody>(res).catch(() => ({} as ApiErrorBody));
    throw new Error(formatError(j, "Falha ao gerar PDF."));
  }

  return res.blob();
}

export function downloadPdfBlob(blob: Blob, filename = "relatorio-orienta-v1.pdf"): void {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
}

export async function generateAndDownloadOfficialReport(payload: {
  formId: string;
  organizationId: string;
}): Promise<void> {
  const loadingId = notify.loading("Gerando PDF…");
  try {
    const blob = await generateOfficialReportPdf(payload);
    downloadPdfBlob(blob);
    notify.success("PDF gerado com dados persistidos no servidor.", { id: loadingId });
  } catch (e) {
    notify.error(e instanceof Error ? e.message : "Erro de rede ao solicitar o relatório.", {
      id: loadingId,
    });
    throw e;
  }
}
