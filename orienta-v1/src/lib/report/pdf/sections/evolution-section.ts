import type { Cursor, OrientaPdfDocument } from "../document";
import { contentWidth, reportTheme } from "../theme";
import { drawSparkline } from "../helpers";

export function renderEvolutionSection(doc: OrientaPdfDocument, _c: Cursor): Cursor {
  let cur = doc.beginMajorSection(
    "Evolução institucional",
    "Tendência de maturidade entre processamentos e anos de referência.",
    "evolution",
  );

  const points = doc.data.evolution;
  if (points.length === 0) {
    return doc.drawParagraph(
      cur,
      "Histórico insuficiente para comparação. Novos processamentos FAMI habilitarão esta análise.",
      { size: 10, gap: 8 },
    );
  }

  const sorted = [...points].sort((a, b) => a.year - b.year);
  const values = sorted.map((p) => p.globalPercentage ?? 0);
  const current = sorted[sorted.length - 1];
  const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
  const delta =
    current?.globalPercentage != null && previous?.globalPercentage != null
      ? current.globalPercentage - previous.globalPercentage
      : null;

  cur = doc.drawParagraph(
    cur,
    `Último fechamento: ${current?.year ?? "—"} · FAMI v${current?.processingVersion ?? doc.data.processingVersion}.`,
    { size: 9, color: reportTheme.slate500, gap: 6 },
  );

  if (delta != null) {
    const sign = delta >= 0 ? "+" : "";
    const trend = delta > 0 ? "crescimento" : delta < 0 ? "retração" : "estabilidade";
    cur = doc.drawParagraph(
      cur,
      `Variação vs. período anterior: ${sign}${delta.toFixed(1)} p.p. (${trend}).`,
      { size: 10, bold: true, gap: 8 },
    );
  }

  cur = doc.ensureBlock(cur, 100);
  cur = drawSparkline(doc, cur, values, contentWidth(), 68);
  cur = { ...cur, y: cur.y - 16 };

  cur = doc.drawSubsectionTitle(cur, "Histórico por ano", undefined);

  for (const pt of sorted) {
    cur = doc.ensureSpace(cur, 44);
    const pct = pt.globalPercentage != null ? `${pt.globalPercentage.toFixed(1)}%` : "—";
    const lvl = pt.globalMaturityLevel != null ? ` · nível ${pt.globalMaturityLevel}` : "";
    cur.page.drawText(`Ano ${pt.year} — v${pt.processingVersion}`, {
      x: reportTheme.margin,
      y: cur.y,
      size: 10,
      font: doc.fonts.bold,
      color: reportTheme.slate900,
    });
    cur.page.drawText(`${pct}${lvl}`, {
      x: reportTheme.margin + 150,
      y: cur.y,
      size: 10,
      font: doc.fonts.regular,
      color: reportTheme.slate600,
    });
    cur = { ...cur, y: cur.y - 16 };

    const axisNames = Object.keys(pt.axisPercentages);
    if (axisNames.length > 0) {
      const parts = axisNames
        .slice(0, 3)
        .map((name) => `${name}: ${(pt.axisPercentages[name] ?? 0).toFixed(0)}%`);
      cur = doc.drawParagraph(cur, parts.join(" · "), { size: 8, indent: 8, gap: 2 });
    }
    cur = { ...cur, y: cur.y - 8 };
  }

  return cur;
}
