import { reportLevelLabel } from "@/lib/report/build-official-report-data";
import type { Cursor, OrientaPdfDocument } from "../document";
import { contentWidth, reportTheme } from "../theme";
import { drawKpiTile } from "../helpers";

export function renderExecutiveSummary(doc: OrientaPdfDocument): Cursor {
  let cur = doc.beginMajorSection(
    "Resumo executivo",
    "Visão consolidada do diagnóstico, indicadores-chave e leitura estratégica.",
    "executive",
  );

  const d = doc.data;
  cur = doc.drawParagraph(
    cur,
    `Diagnóstico "${d.formName}" · ${d.organizationName} · FAMI v${d.processingVersion} (ano ${d.referenceYear}).`,
    { size: 10, gap: 8 },
  );

  const w = contentWidth();
  const gap = 12;
  const tileW = (w - gap) / 2;
  const tileH = 72;
  cur = doc.ensureBlock(cur, tileH * 2 + gap + 20);
  const rowY = cur.y;

  const { actionPlan, evidence, fami } = d;
  drawKpiTile(doc, cur, {
    label: "Score FAMI",
    value: `${fami.global.percentage.toFixed(1)}%`,
    sub: reportLevelLabel(fami.global.maturityLevel),
    x: reportTheme.margin,
    y: rowY,
    w: tileW,
    h: tileH,
    accent: reportTheme.brand,
  });
  drawKpiTile(doc, cur, {
    label: "Recomendações",
    value: String(actionPlan.summary.totalRecommendations),
    sub: "no portfólio",
    x: reportTheme.margin + tileW + gap,
    y: rowY,
    w: tileW,
    h: tileH,
    accent: reportTheme.sky,
  });

  const row2Y = rowY - tileH - gap;
  drawKpiTile(doc, cur, {
    label: "Planos de ação",
    value: String(actionPlan.summary.totalActions),
    sub: `${actionPlan.summary.recommendationsWithActions} com ações`,
    x: reportTheme.margin,
    y: row2Y,
    w: tileW,
    h: tileH,
    accent: reportTheme.emerald,
  });
  drawKpiTile(doc, cur, {
    label: "Evidências",
    value: String(evidence.total),
    sub: `${evidence.approved} aprovadas`,
    x: reportTheme.margin + tileW + gap,
    y: row2Y,
    w: tileW,
    h: tileH,
    accent: reportTheme.amber,
  });

  cur = { page: cur.page, y: row2Y - tileH - 24 };

  const insightH = 92;
  const card = doc.drawRoundedCard(cur, insightH, { fill: reportTheme.brandLight });
  card.cursor.page.drawText("Leitura estratégica", {
    x: card.innerX,
    y: card.innerY,
    size: 11,
    font: doc.fonts.bold,
    color: reportTheme.slate900,
  });
  let iy = card.innerY - 20;
  const critical =
    d.criticalAxesCount > 0
      ? `${d.criticalAxesCount} eixo(s) abaixo de 50% — priorizar planos corretivos.`
      : "Nenhum eixo na faixa crítica (<50%) nesta versão.";
  for (const line of doc.chunkText(critical, 72)) {
    card.cursor.page.drawText(line, {
      x: card.innerX,
      y: iy,
      size: 9,
      font: doc.fonts.regular,
      color: reportTheme.slate700,
      maxWidth: card.innerW,
    });
    iy -= 13;
  }
  const opp = d.topOpportunityAxis
    ? `Oportunidade prioritária: eixo ${d.topOpportunityAxis}.`
    : d.advancedAxesCount > 0
      ? `${d.advancedAxesCount} eixo(s) ≥75% — replicar boas práticas.`
      : "Evolução gradual recomendada em todos os eixos.";
  for (const line of doc.chunkText(opp, 72)) {
    card.cursor.page.drawText(line, {
      x: card.innerX,
      y: iy,
      size: 9,
      font: doc.fonts.regular,
      color: reportTheme.slate600,
      maxWidth: card.innerW,
    });
    iy -= 13;
  }

  return { page: card.cursor.page, y: card.cursor.y - 16 };
}
