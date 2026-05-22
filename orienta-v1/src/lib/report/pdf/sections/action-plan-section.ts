import type { ActionPlanAction } from "@/lib/domain/action-plans";
import type { Cursor, OrientaPdfDocument } from "../document";
import { contentWidth, reportTheme } from "../theme";
import { drawProgressBar, statusLabelPt } from "../helpers";

function actionProgress(status: string): number {
  if (status === "completed") return 100;
  if (status === "in_progress") return 55;
  if (status === "to_implement") return 15;
  if (status === "cancelled") return 0;
  return 30;
}

function renderActionCard(doc: OrientaPdfDocument, c: Cursor, ac: ActionPlanAction, n: number): Cursor {
  const obs = ac.observations?.trim();
  const obsLines = obs ? doc.chunkText(obs, 70).length : 0;
  const h = 82 + obsLines * 12;
  let cur = doc.ensureBlock(c, h);
  const w = contentWidth();

  cur.page.drawRectangle({
    x: reportTheme.margin,
    y: cur.y - h,
    width: w,
    height: h,
    color: reportTheme.white,
    borderColor: reportTheme.slate200,
    borderWidth: 0.75,
  });

  const ix = reportTheme.margin + 14;
  let iy = cur.y - 16;
  cur.page.drawText(`Ação ${n}`, {
    x: ix,
    y: iy,
    size: 8,
    font: doc.fonts.regular,
    color: reportTheme.slate500,
  });
  iy -= 14;
  for (const line of doc.chunkText(ac.actionText, 74)) {
    cur.page.drawText(line, {
      x: ix,
      y: iy,
      size: 10,
      font: doc.fonts.bold,
      color: reportTheme.slate900,
      maxWidth: w - 28,
    });
    iy -= 12;
  }

  const meta = `${ac.responsibleName} · ${ac.responsibleSector} · Prazo ${ac.dueDate} · ${statusLabelPt(ac.status)}`;
  for (const line of doc.chunkText(meta, 74)) {
    cur.page.drawText(line, {
      x: ix,
      y: iy,
      size: 8,
      font: doc.fonts.regular,
      color: reportTheme.slate600,
      maxWidth: w - 28,
    });
    iy -= 10;
  }

  drawProgressBar(doc, cur.page, ix, iy - 6, w - 28, actionProgress(ac.status));
  iy -= 20;

  if (obs) {
    for (const line of doc.chunkText(`Obs.: ${obs}`, 70)) {
      cur.page.drawText(line, {
        x: ix,
        y: iy,
        size: 8,
        font: doc.fonts.regular,
        color: reportTheme.slate500,
        maxWidth: w - 28,
      });
      iy -= 10;
    }
  }

  return { page: cur.page, y: cur.y - h - 14 };
}

export function renderActionPlanSection(doc: OrientaPdfDocument, _c: Cursor): Cursor {
  let cur = doc.beginMajorSection(
    "Plano de ação",
    "Iniciativas operacionais vinculadas às recomendações.",
    "action-plan",
  );

  const { summary, axes } = doc.data.actionPlan;
  cur = doc.drawParagraph(
    cur,
    `${summary.totalActions} ação(ões) em ${summary.recommendationsWithActions} recomendação(ões) com plano.`,
    { size: 9, color: reportTheme.slate500, gap: 6 },
  );

  if (summary.totalActions === 0) {
    return doc.drawParagraph(
      cur,
      "Nenhuma ação cadastrada. Registre responsáveis e prazos no portfólio de recomendações.",
      { size: 10, gap: 8 },
    );
  }

  let actionIdx = 0;
  for (const axis of axes) {
    const hasActions = axis.recommendations.some((r) => r.actions.length > 0);
    if (!hasActions) continue;

    cur = doc.ensureSpace(cur, 28);
    cur.page.drawText(axis.axisName, {
      x: reportTheme.margin,
      y: cur.y,
      size: 11,
      font: doc.fonts.bold,
      color: reportTheme.brandDark,
    });
    cur = { ...cur, y: cur.y - 24 };

    for (const rec of axis.recommendations) {
      if (rec.actions.length === 0) continue;
      cur = doc.ensureBlock(cur, 40);
      cur.page.drawText("Vinculada à recomendação", {
        x: reportTheme.margin + 4,
        y: cur.y,
        size: 7,
        font: doc.fonts.regular,
        color: reportTheme.slate500,
      });
      cur = doc.drawParagraph(cur, rec.recommendationText, { size: 9, indent: 4, gap: 4 });

      for (const ac of rec.actions) {
        actionIdx += 1;
        cur = renderActionCard(doc, cur, ac, actionIdx);
      }
    }
  }

  return cur;
}
