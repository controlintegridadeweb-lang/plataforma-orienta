import { reportLevelLabel } from "@/lib/report/build-official-report-data";
import type { Cursor, OrientaPdfDocument } from "../document";
import { reportTheme } from "../theme";

export function renderConclusionSection(doc: OrientaPdfDocument, _c: Cursor): Cursor {
  let cur = doc.beginMajorSection(
    "Conclusão técnica",
    "Síntese para governança e encaminhamentos prioritários.",
    "conclusion",
  );

  const d = doc.data;
  const g = d.fami.global;
  const bullets = [
    `Maturidade consolidada: ${g.percentage.toFixed(1)}% (${reportLevelLabel(g.maturityLevel)}), FAMI v${d.processingVersion}.`,
    d.criticalAxesCount > 0
      ? `${d.criticalAxesCount} eixo(s) em faixa crítica (<50%) — planos corretivos prioritários.`
      : "Eixos acima do limiar crítico nesta versão.",
    `${d.actionPlan.summary.totalRecommendations} recomendação(ões) e ${d.actionPlan.summary.totalActions} ação(ões) de acompanhamento.`,
    d.evidence.total > 0
      ? `${d.evidence.approved}/${d.evidence.total} evidências aprovadas.`
      : "Reforçar envio de evidências para validação.",
    d.evolution.length >= 2
      ? "Série histórica disponível para metas plurianuais."
      : "Novos processamentos habilitarão análise de tendência.",
  ];

  for (const b of bullets) {
    cur = doc.ensureSpace(cur, 24);
    cur.page.drawText("•", {
      x: reportTheme.margin,
      y: cur.y,
      size: 11,
      font: doc.fonts.bold,
      color: reportTheme.brand,
    });
    cur = doc.drawParagraph(cur, b, { size: 10, indent: 14, gap: 6 });
  }

  const h = 60;
  const card = doc.drawRoundedCard(cur, h, { fill: reportTheme.brandLight });
  card.cursor.page.drawText("Próximos passos", {
    x: card.innerX,
    y: card.innerY,
    size: 10,
    font: doc.fonts.bold,
    color: reportTheme.brandDark,
  });
  card.cursor.page.drawText(
    "Priorizar eixos críticos, cumprir prazos do plano de ação e concluir validação de evidências.",
    {
      x: card.innerX,
      y: card.innerY - 20,
      size: 9,
      font: doc.fonts.regular,
      color: reportTheme.slate700,
      maxWidth: card.innerW,
    },
  );

  return { page: card.cursor.page, y: card.cursor.y - 16 };
}
