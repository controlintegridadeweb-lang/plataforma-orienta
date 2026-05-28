import type { ActionPlanRecommendationNode } from "@/lib/domain/action-plans";
import type { Cursor, OrientaPdfDocument } from "../document";
import { contentWidth, reportTheme } from "../theme";
import {
  drawBadge,
  estimateCardHeight,
  priorityFromType,
  recommendationAccent,
  statusLabelPt,
} from "../helpers";

function renderRecommendationCard(
  doc: OrientaPdfDocument,
  c: Cursor,
  rec: ActionPlanRecommendationNode,
  index: number,
  axisName: string,
): Cursor {
  const descLines = doc.chunkText(rec.recommendationText, 76).length;
  const h = estimateCardHeight(descLines + 4, 92);
  const cur = doc.ensureBlock(c, h);
  const accent = recommendationAccent(rec.recommendationType);
  const w = contentWidth();

  cur.page.drawRectangle({
    x: reportTheme.margin,
    y: cur.y - h,
    width: w,
    height: h,
    color: reportTheme.white,
    borderColor: accent.border,
    borderWidth: 0.75,
  });
  cur.page.drawRectangle({
    x: reportTheme.margin,
    y: cur.y - h,
    width: 3,
    height: h,
    color: accent.border,
  });

  const ix = reportTheme.margin + 14;
  let iy = cur.y - 16;
  cur.page.drawText(`Recomendação ${index}`, {
    x: ix,
    y: iy,
    size: 8,
    font: doc.fonts.bold,
    color: reportTheme.slate500,
  });
  iy -= 16;

  let bx = ix;
  bx += drawBadge(doc, cur.page, bx, iy, axisName, {
    bg: reportTheme.slate100,
    text: reportTheme.slate600,
  });
  bx += drawBadge(doc, cur.page, bx, iy, priorityFromType(rec.recommendationType), {
    bg: accent.bg,
    text: accent.text,
  });
  drawBadge(doc, cur.page, bx, iy, statusLabelPt(rec.recommendationStatus), {
    bg: reportTheme.skyBg,
    text: reportTheme.sky,
  });
  iy -= 22;

  for (const line of doc.chunkText(rec.recommendationText, 76)) {
    cur.page.drawText(line, {
      x: ix,
      y: iy,
      size: 9,
      font: doc.fonts.regular,
      color: reportTheme.slate700,
      maxWidth: w - 28,
    });
    iy -= 12;
  }

  const note =
    rec.actions.length > 0
      ? `${rec.actions.length} ação(ões) vinculada(s)`
      : "Sem ações vinculadas";
  cur.page.drawText(note, {
    x: ix,
    y: iy - 4,
    size: 8,
    font: doc.fonts.regular,
    color: reportTheme.slate500,
  });

  return { page: cur.page, y: cur.y - h - 14 };
}

export function renderRecommendationsSection(doc: OrientaPdfDocument): Cursor {
  let cur = doc.beginMajorSection(
    "Recomendações",
    "Portfólio por eixo com prioridade, status e planos vinculados.",
    "recommendations",
  );

  const { axes, summary } = doc.data.actionPlan;
  cur = doc.drawParagraph(
    cur,
    `${summary.totalRecommendations} recomendação(ões) mapeadas.`,
    { size: 9, color: reportTheme.slate500, gap: 6 },
  );

  if (summary.totalRecommendations === 0) {
    return doc.drawParagraph(cur, "Nenhuma recomendação registrada para este formulário.", {
      size: 10,
      gap: 8,
    });
  }

  let globalIdx = 0;
  for (const axis of axes) {
    if (axis.recommendations.length === 0) continue;
    cur = doc.ensureSpace(cur, 36);
    cur.page.drawText(axis.axisName, {
      x: reportTheme.margin,
      y: cur.y,
      size: 11,
      font: doc.fonts.bold,
      color: reportTheme.brandDark,
    });
    cur = { ...cur, y: cur.y - 24 };

    for (const rec of axis.recommendations) {
      globalIdx += 1;
      cur = renderRecommendationCard(doc, cur, rec, globalIdx, axis.axisName);
    }
    cur = { ...cur, y: cur.y - 8 };
  }

  return cur;
}
