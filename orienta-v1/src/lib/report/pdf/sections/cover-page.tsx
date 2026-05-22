/**
 * Capa institucional — layout editorial fixo, dados dinâmicos, sem rodapé.
 */

import type { PDFPage } from "pdf-lib";
import { levelMeta } from "@/lib/fami/respondent-presentation";
import type { OfficialReportData } from "@/lib/report/build-official-report-data";
import type { Cursor, OrientaPdfDocument, ReportFonts } from "../document";
import { reportTheme } from "../theme";
import { drawCoverGeometricPanel } from "./cover-geometric-panel";

export type CoverPageProps = {
  organizationName: string;
  formName: string;
  famiVersion: number;
  famiLevel: number;
  famiLevelLabel: string;
  famiScore: number;
  generatedAt: string;
  referenceYear: number;
};

export function buildCoverPageProps(data: OfficialReportData): CoverPageProps {
  const lvl = data.fami.global.maturityLevel;
  const meta = levelMeta(lvl);
  return {
    organizationName: data.organizationName,
    formName: data.formName,
    famiVersion: data.processingVersion,
    famiLevel: lvl,
    famiLevelLabel: `N${lvl} — ${meta.shortLabel}`,
    famiScore: data.fami.global.percentage,
    generatedAt: new Date(data.generatedAtIso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    referenceYear: data.referenceYear,
  };
}

const LEFT_X: number = reportTheme.margin;
const TEXT_W = reportTheme.page.w * 0.56 - reportTheme.margin;

type FieldRow = { label: string; value: string };

function wrapLines(
  fonts: ReportFonts,
  text: string,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (fonts.regular.widthOfTextAtSize(next, size) <= maxWidth) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawSeal(page: PDFPage, fonts: ReportFonts, x: number, topY: number): void {
  const w = 112;
  const h = 26;
  page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h,
    borderColor: reportTheme.coverGeoDark,
    borderWidth: 0.6,
    color: reportTheme.white,
  });
  page.drawText("DOCUMENTO OFICIAL", {
    x: x + 8,
    y: topY - h + 8,
    size: 6.5,
    font: fonts.bold,
    color: reportTheme.coverGeoDark,
  });
}

function drawField(
  page: PDFPage,
  fonts: ReportFonts,
  x: number,
  y: number,
  field: FieldRow,
  valueMaxW: number,
): number {
  page.drawText(field.label.toUpperCase(), {
    x,
    y,
    size: 8,
    font: fonts.bold,
    color: reportTheme.coverInk,
  });
  let cy = y - 14;
  for (const line of wrapLines(fonts, field.value, 10, valueMaxW)) {
    page.drawText(line, {
      x,
      y: cy,
      size: 10,
      font: fonts.regular,
      color: reportTheme.coverInkMuted,
    });
    cy -= 13;
  }
  return cy - 18;
}

export function renderCoverPageContent(
  doc: OrientaPdfDocument,
  page: PDFPage,
  props: CoverPageProps,
): void {
  const fonts = doc.fonts;
  const H = reportTheme.page.h;

  page.drawRectangle({
    x: 0,
    y: 0,
    width: reportTheme.page.w,
    height: H,
    color: reportTheme.coverBg,
  });
  drawCoverGeometricPanel(page);

  const topY = H - reportTheme.margin;

  if (doc.logo) {
    const logoH = 30;
    const logoW = (doc.logo.width / doc.logo.height) * logoH;
    page.drawImage(doc.logo, {
      x: LEFT_X,
      y: topY - logoH,
      width: logoW,
      height: logoH,
    });
    drawSeal(page, fonts, LEFT_X + logoW + 14, topY);
  } else {
    page.drawText("Plataforma Orienta", {
      x: LEFT_X,
      y: topY - 20,
      size: 13,
      font: fonts.bold,
      color: reportTheme.coverGeoDark,
    });
    drawSeal(page, fonts, LEFT_X + 210, topY);
  }

  const titleBlockY = H * 0.55;
  page.drawText("ANO REFERÊNCIA", {
    x: LEFT_X,
    y: titleBlockY,
    size: 10,
    font: fonts.bold,
    color: reportTheme.coverInk,
  });
  page.drawText(String(props.referenceYear), {
    x: LEFT_X,
    y: titleBlockY - 26,
    size: 30,
    font: fonts.bold,
    color: reportTheme.coverInk,
  });
  page.drawText("RELATÓRIO", {
    x: LEFT_X,
    y: titleBlockY - 92,
    size: 44,
    font: fonts.bold,
    color: reportTheme.coverInk,
  });

  const fields: FieldRow[] = [
    { label: "Formulário", value: props.formName },
    { label: "Órgão", value: props.organizationName },
    { label: "Versão FAMI", value: `v${props.famiVersion}` },
    { label: "Nível FAMI", value: props.famiLevelLabel },
    { label: "Percentual", value: `${props.famiScore.toFixed(1)}%` },
    { label: "Gerado em", value: props.generatedAt },
  ];

  const colGap = 32;
  const colW = (TEXT_W - colGap) / 2;
  const fieldsTop = H * 0.34;
  let leftY = fieldsTop;
  let rightY = fieldsTop;

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!;
    if (i < 3) leftY = drawField(page, fonts, LEFT_X, leftY, field, colW);
    else rightY = drawField(page, fonts, LEFT_X + colW + colGap, rightY, field, colW);
  }
}

export function renderCoverPage(doc: OrientaPdfDocument): void {
  const c = doc.newPage();
  renderCoverPageContent(doc, c.page, buildCoverPageProps(doc.data));
}
