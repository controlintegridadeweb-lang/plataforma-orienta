import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { EvidenceListItem, EvidenceStatsResult } from "./admin-service";
import { STATUS_BADGE_META } from "./status-groups";

const CSV_BOM = "\uFEFF";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (/[",\n\r;]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(";");
}

function formatDateBr(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR");
}

function statusLabel(status: EvidenceListItem["currentStatus"]): string {
  return STATUS_BADGE_META[status].label;
}

export function buildEvidencesCsv(items: EvidenceListItem[]): string {
  const lines: string[] = [];
  lines.push(
    csvRow([
      "ID",
      "Formulario",
      "Pergunta",
      "Orgao",
      "Enviada em",
      "Status",
      "Titulo",
      "Tipo",
      "Link",
      "Caminho",
      "Motivo excecao",
    ]),
  );
  for (const i of items) {
    lines.push(
      csvRow([
        i.id,
        i.formName,
        i.questionPrompt,
        i.organizationName,
        formatDateBr(i.submittedAt),
        statusLabel(i.currentStatus),
        i.title,
        i.evidenceType,
        i.externalLink ?? "",
        i.storagePath ?? "",
        i.exceptionReason ?? "",
      ]),
    );
  }
  return CSV_BOM + lines.join("\r\n");
}

function asciiSafe(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .trim();
}

type PdfCtx = {
  pdf: PDFDocument;
  font: import("pdf-lib").PDFFont;
  bold: import("pdf-lib").PDFFont;
  page: import("pdf-lib").PDFPage;
  y: number;
};

const MARGIN = 50;
const TOP = 800;
const BOTTOM = 50;

function ensureSpace(ctx: PdfCtx, need: number) {
  if (ctx.y - need < BOTTOM) {
    ctx.page = ctx.pdf.addPage([595, 842]);
    ctx.y = TOP;
  }
}

function drawLine(ctx: PdfCtx, text: string, opts: { size?: number; bold?: boolean } = {}) {
  const size = opts.size ?? 11;
  ensureSpace(ctx, size + 4);
  ctx.page.drawText(asciiSafe(text), {
    x: MARGIN,
    y: ctx.y,
    size,
    font: opts.bold ? ctx.bold : ctx.font,
    color: rgb(0.1, 0.1, 0.1),
  });
  ctx.y -= size + 4;
}

export type EvidencesExportPdfPayload = {
  items: EvidenceListItem[];
  stats: EvidenceStatsResult;
  generatedAtIso?: string;
};

export async function buildEvidencesPdf(
  payload: EvidencesExportPdfPayload,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ctx: PdfCtx = { pdf, font, bold, page: pdf.addPage([595, 842]), y: TOP };

  drawLine(ctx, "Exportacao de evidencias - Plataforma Orienta", { size: 16, bold: true });
  drawLine(
    ctx,
    `Gerado em: ${formatDateBr(payload.generatedAtIso ?? new Date().toISOString())}`,
    { size: 9 },
  );
  ctx.y -= 8;
  drawLine(ctx, "Resumo", { size: 12, bold: true });
  drawLine(ctx, `Total (export): ${payload.items.length}`, { size: 10 });
  drawLine(
    ctx,
    `Em analise (agrupado): ${payload.stats.em_analise} | Aprovadas: ${payload.stats.aprovadas} | Rejeitadas: ${payload.stats.rejeitadas}`,
    { size: 10 },
  );
  ctx.y -= 6;
  drawLine(ctx, "Linhas", { size: 12, bold: true });

  for (const i of payload.items) {
    const head = `${i.formName} / ${i.organizationName}`;
    ensureSpace(ctx, 40);
    drawLine(ctx, head, { bold: true, size: 10 });
    drawLine(
      ctx,
      `${i.questionPrompt} — ${statusLabel(i.currentStatus)} — ${formatDateBr(i.submittedAt)}`,
      { size: 9 },
    );
    drawLine(ctx, `${i.title} (${i.evidenceType})`, { size: 9 });
    ctx.y -= 4;
  }

  return pdf.save();
}
