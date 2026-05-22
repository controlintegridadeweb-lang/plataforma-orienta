import { reportLevelLabel } from "@/lib/report/build-official-report-data";
import type { Cursor, OrientaPdfDocument } from "../document";
import { contentWidth, reportTheme } from "../theme";
import { drawMiniBarChart, drawProgressBar } from "../helpers";

const LEVELS = [
  { n: 1, label: "Inicial" },
  { n: 2, label: "Básico" },
  { n: 3, label: "Intermediário" },
  { n: 4, label: "Avançado" },
  { n: 5, label: "Excelência" },
];

export function renderFamiSection(doc: OrientaPdfDocument, _c: Cursor): Cursor {
  let cur = doc.beginMajorSection(
    "Resultado FAMI",
    "Pontuação consolidada e comparativo entre eixos estruturais.",
    "fami",
  );

  const global = doc.data.fami.global;
  const scoreH = 108;
  const card = doc.drawRoundedCard(cur, scoreH, { fill: reportTheme.brandLight });
  card.cursor.page.drawText("Score global", {
    x: card.innerX,
    y: card.innerY,
    size: 9,
    font: doc.fonts.regular,
    color: reportTheme.slate500,
  });
  card.cursor.page.drawText(`${global.percentage.toFixed(1)}%`, {
    x: card.innerX,
    y: card.innerY - 24,
    size: 30,
    font: doc.fonts.bold,
    color: reportTheme.brandDark,
  });
  card.cursor.page.drawText(reportLevelLabel(global.maturityLevel), {
    x: card.innerX + 108,
    y: card.innerY - 20,
    size: 12,
    font: doc.fonts.bold,
    color: reportTheme.slate700,
  });
  drawProgressBar(doc, card.cursor.page, card.innerX, card.innerY - 56, card.innerW, global.percentage);
  cur = { page: card.cursor.page, y: card.cursor.y - 20 };

  cur = doc.ensureSpace(cur, 40);
  cur.page.drawText("Escala de maturidade (1–5)", {
    x: reportTheme.margin,
    y: cur.y,
    size: 9,
    font: doc.fonts.bold,
    color: reportTheme.slate600,
  });
  cur = { ...cur, y: cur.y - 20 };
  const scaleW = contentWidth();
  const step = scaleW / 5;
  LEVELS.forEach((lv, i) => {
    const active = global.maturityLevel === lv.n;
    const x = reportTheme.margin + i * step;
    cur.page.drawRectangle({
      x: x + 2,
      y: cur.y - 14,
      width: step - 6,
      height: 14,
      color: active ? reportTheme.brand : reportTheme.slate100,
      borderColor: active ? reportTheme.brandDark : reportTheme.slate200,
      borderWidth: 0.5,
    });
    cur.page.drawText(String(lv.n), {
      x: x + step / 2 - 4,
      y: cur.y - 11,
      size: 8,
      font: doc.fonts.bold,
      color: active ? reportTheme.white : reportTheme.slate500,
    });
  });
  cur = { ...cur, y: cur.y - 32 };

  cur = doc.drawSubsectionTitle(
    cur,
    "Resultado por eixo",
    "Governança, Ambiental e Social.",
  );

  const axes = doc.data.fami.byAxis;
  if (axes.length > 0) {
    cur = doc.ensureBlock(cur, 130);
    cur = drawMiniBarChart(
      doc,
      cur,
      axes.map((a) => ({ label: a.axisName, value: a.percentage })),
      110,
    );
    cur = { ...cur, y: cur.y - 12 };
  }

  for (const ax of axes) {
    const h = 56;
    cur = doc.ensureBlock(cur, h);
    cur.page.drawRectangle({
      x: reportTheme.margin,
      y: cur.y - h,
      width: contentWidth(),
      height: h,
      color: reportTheme.white,
      borderColor: reportTheme.slate200,
      borderWidth: 0.75,
    });
    cur.page.drawRectangle({
      x: reportTheme.margin,
      y: cur.y - h,
      width: 3,
      height: h,
      color: reportTheme.brand,
    });
    cur.page.drawText(ax.axisName, {
      x: reportTheme.margin + 14,
      y: cur.y - 18,
      size: 11,
      font: doc.fonts.bold,
      color: reportTheme.slate900,
    });
    cur.page.drawText(
      `${ax.percentage.toFixed(1)}% · ${reportLevelLabel(ax.maturityLevel)}`,
      {
        x: reportTheme.margin + 14,
        y: cur.y - 34,
        size: 9,
        font: doc.fonts.regular,
        color: reportTheme.slate600,
      },
    );
    drawProgressBar(
      doc,
      cur.page,
      reportTheme.margin + 14,
      cur.y - 48,
      contentWidth() - 28,
      ax.percentage,
    );
    cur = { ...cur, y: cur.y - h - 14 };
  }

  return cur;
}
