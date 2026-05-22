import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  RESPONDENT_STATUS_LABEL,
  type AnswersOverview,
  type AnswersSummary,
  type RespondentRow,
} from "./answers-types";

/**
 * Erro lancado quando o formato pedido nao esta habilitado (ex.: XLSX
 * desligado por flag). Convertido em 501 (Not Implemented) na rota HTTP.
 */
export class FormsExportUnavailable extends Error {
  constructor(message = "Formato de exportacao nao disponivel.") {
    super(message);
    this.name = "FormsExportUnavailable";
  }
}

export type ExportPayload = {
  form: { id: string; name: string };
  overview: AnswersOverview;
  summary: AnswersSummary;
  respondents: RespondentRow[];
  generatedAtIso?: string;
};

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
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR");
}

function formatDateOnly(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}

/**
 * Gera um CSV (delimitador `;` para compatibilidade com Excel pt-BR) contendo:
 *   - cabecalho com metadados do formulario
 *   - linha em branco
 *   - tabela de respondentes (orgao, status, respostas, ultima atualizacao)
 *   - linha em branco
 *   - resumo por pergunta com totais por valor
 */
export function buildAnswersCsv(payload: ExportPayload): string {
  const lines: string[] = [];
  lines.push(csvRow(["Formulario", payload.form.name]));
  lines.push(
    csvRow(["Total de respondentes", payload.overview.totalRespondents]),
  );
  lines.push(csvRow(["Total de perguntas", payload.overview.totalQuestions]));
  lines.push(
    csvRow([
      "Ultima resposta",
      payload.overview.lastAnswerAt
        ? formatDateBr(payload.overview.lastAnswerAt)
        : "—",
    ]),
  );
  lines.push(
    csvRow([
      "Gerado em",
      formatDateBr(payload.generatedAtIso ?? new Date().toISOString()),
    ]),
  );
  lines.push("");

  lines.push(csvRow(["RESPONDENTES"]));
  lines.push(
    csvRow([
      "Orgao",
      "Status",
      "Respondidas",
      "Total de perguntas",
      "Contribuintes",
      "Ultima atualizacao",
    ]),
  );
  for (const r of payload.respondents) {
    lines.push(
      csvRow([
        r.organizationName,
        RESPONDENT_STATUS_LABEL[r.status],
        r.answeredQuestions,
        r.totalQuestions,
        r.contributorCount,
        formatDateBr(r.lastUpdatedAt),
      ]),
    );
  }

  lines.push("");
  lines.push(csvRow(["RESUMO POR PERGUNTA"]));
  lines.push(
    csvRow([
      "#",
      "Pergunta",
      "Tipo",
      "Respostas",
      "Sim",
      "Nao",
      "Parcial",
    ]),
  );
  for (const q of payload.summary.questions) {
    lines.push(
      csvRow([
        q.orderIndex + 1,
        q.prompt,
        q.answerType,
        q.totalResponses,
        q.distribution.yes,
        q.distribution.no,
        q.distribution.partial,
      ]),
    );
  }

  // Itens textuais (perguntas discursivas) — uma linha por entrada.
  const textBlocks = payload.summary.questions.filter(
    (q) => q.answerType === "text" && q.textEntries.length > 0,
  );
  if (textBlocks.length > 0) {
    lines.push("");
    lines.push(csvRow(["RESPOSTAS TEXTUAIS"]));
    lines.push(csvRow(["#", "Pergunta", "Orgao", "Resposta", "Data"]));
    for (const q of textBlocks) {
      for (const entry of q.textEntries) {
        lines.push(
          csvRow([
            q.orderIndex + 1,
            q.prompt,
            entry.organizationName,
            entry.notes,
            formatDateOnly(entry.updatedAt),
          ]),
        );
      }
    }
  }

  return CSV_BOM + lines.join("\r\n");
}

/**
 * Sanitiza string para Latin-1 (cobertura do StandardFonts.Helvetica do
 * pdf-lib). Substitui acentuados nao representaveis por aproximacoes ASCII
 * para evitar `Error: WinAnsi cannot encode <char>` no `drawText`.
 */
function asciiSafe(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .trim();
}

type PdfContext = {
  pdf: PDFDocument;
  font: import("pdf-lib").PDFFont;
  bold: import("pdf-lib").PDFFont;
  page: import("pdf-lib").PDFPage;
  y: number;
};

const MARGIN_X = 50;
const TOP_Y = 800;
const BOTTOM_Y = 60;

function ensureSpace(ctx: PdfContext, needed: number): void {
  if (ctx.y - needed < BOTTOM_Y) {
    ctx.page = ctx.pdf.addPage([595, 842]);
    ctx.y = TOP_Y;
  }
}

function drawText(
  ctx: PdfContext,
  text: string,
  options: {
    size?: number;
    bold?: boolean;
    color?: ReturnType<typeof rgb>;
    indent?: number;
  } = {},
): void {
  const size = options.size ?? 11;
  const indent = options.indent ?? 0;
  ensureSpace(ctx, size + 4);
  ctx.page.drawText(asciiSafe(text), {
    x: MARGIN_X + indent,
    y: ctx.y,
    size,
    font: options.bold ? ctx.bold : ctx.font,
    color: options.color ?? rgb(0.1, 0.1, 0.1),
  });
  ctx.y -= size + 4;
}

function drawDivider(ctx: PdfContext): void {
  ensureSpace(ctx, 8);
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: ctx.y },
    end: { x: 545, y: ctx.y },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });
  ctx.y -= 10;
}

function drawSpacer(ctx: PdfContext, height = 8): void {
  ensureSpace(ctx, height);
  ctx.y -= height;
}

function wrapLine(
  text: string,
  font: import("pdf-lib").PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const safe = asciiSafe(text);
  const words = safe.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, size);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawParagraph(
  ctx: PdfContext,
  text: string,
  options: { indent?: number; size?: number; bold?: boolean } = {},
): void {
  const size = options.size ?? 11;
  const indent = options.indent ?? 0;
  const maxWidth = 545 - MARGIN_X - indent;
  const font = options.bold ? ctx.bold : ctx.font;
  const lines = wrapLine(text, font, size, maxWidth);
  for (const line of lines) {
    drawText(ctx, line, { size, bold: options.bold, indent });
  }
}

/**
 * Gera um PDF resumo (cabecalho + KPIs + resumo por pergunta + lista de
 * respondentes). Estilo neutro alinhado a `src/lib/report/pdf.ts`.
 */
export async function buildAnswersPdf(
  payload: ExportPayload,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ctx: PdfContext = { pdf, font, bold, page, y: TOP_Y };

  drawText(ctx, "Relatorio de respostas - Plataforma Orienta", {
    size: 16,
    bold: true,
  });
  drawSpacer(ctx, 4);
  drawText(ctx, `Formulario: ${payload.form.name}`, { size: 11 });
  drawText(
    ctx,
    `Gerado em: ${formatDateBr(payload.generatedAtIso ?? new Date().toISOString())}`,
    { size: 9, color: rgb(0.35, 0.35, 0.35) },
  );
  drawSpacer(ctx, 6);
  drawDivider(ctx);

  drawText(ctx, "Visao geral", { size: 13, bold: true });
  drawText(
    ctx,
    `Total de respondentes: ${payload.overview.totalRespondents}`,
    { indent: 6 },
  );
  drawText(
    ctx,
    `Total de perguntas: ${payload.overview.totalQuestions}`,
    { indent: 6 },
  );
  drawText(
    ctx,
    `Ultima resposta: ${
      payload.overview.lastAnswerAt
        ? formatDateBr(payload.overview.lastAnswerAt)
        : "—"
    }`,
    { indent: 6 },
  );
  drawSpacer(ctx, 4);
  drawText(ctx, "Status dos respondentes:", { bold: true, indent: 6 });
  for (const status of Object.keys(payload.overview.statusBreakdown) as Array<
    keyof typeof payload.overview.statusBreakdown
  >) {
    drawText(
      ctx,
      `- ${RESPONDENT_STATUS_LABEL[status]}: ${payload.overview.statusBreakdown[status]}`,
      { indent: 14, size: 10 },
    );
  }
  drawSpacer(ctx, 6);
  drawDivider(ctx);

  drawText(ctx, "Resumo por pergunta", { size: 13, bold: true });
  drawSpacer(ctx, 2);
  for (const q of payload.summary.questions) {
    drawParagraph(ctx, `${q.orderIndex + 1}. ${q.prompt}`, { bold: true });
    drawText(
      ctx,
      `Tipo: ${q.answerType} - Respostas: ${q.totalResponses}`,
      { size: 9, indent: 6, color: rgb(0.35, 0.35, 0.35) },
    );
    drawText(
      ctx,
      `Sim: ${q.distribution.yes} | Nao: ${q.distribution.no} | Parcial: ${q.distribution.partial}`,
      { size: 10, indent: 6 },
    );
    if (q.answerType === "text" && q.textEntries.length > 0) {
      drawText(ctx, "Respostas:", { size: 10, indent: 6, bold: true });
      for (const entry of q.textEntries.slice(0, 10)) {
        drawParagraph(
          ctx,
          `- ${entry.organizationName}: ${entry.notes}`,
          { size: 10, indent: 12 },
        );
      }
      if (q.textEntries.length > 10) {
        drawText(
          ctx,
          `(+${q.textEntries.length - 10} respostas adicionais)`,
          { size: 9, indent: 12, color: rgb(0.45, 0.45, 0.45) },
        );
      }
    }
    drawSpacer(ctx, 4);
  }
  drawDivider(ctx);

  drawText(ctx, "Respondentes", { size: 13, bold: true });
  drawSpacer(ctx, 2);
  for (const r of payload.respondents) {
    drawParagraph(ctx, `${r.organizationName}`, { bold: true });
    drawText(
      ctx,
      `Status: ${RESPONDENT_STATUS_LABEL[r.status]} - ${r.answeredQuestions}/${r.totalQuestions} respondidas`,
      { size: 10, indent: 6 },
    );
    drawText(
      ctx,
      `Ultima atualizacao: ${formatDateBr(r.lastUpdatedAt)} - Contribuintes: ${r.contributorCount}`,
      { size: 9, indent: 6, color: rgb(0.35, 0.35, 0.35) },
    );
    drawSpacer(ctx, 3);
  }

  return pdf.save();
}

/**
 * Stub do XLSX. Manter como hook para futura habilitacao via `exceljs`.
 * Hoje sempre lanca `FormsExportUnavailable` (retornado como 501 na rota).
 */
export function buildAnswersXlsx(payload: ExportPayload): never {
  void payload;
  throw new FormsExportUnavailable(
    "Exportacao em Excel sera habilitada em breve.",
  );
}
