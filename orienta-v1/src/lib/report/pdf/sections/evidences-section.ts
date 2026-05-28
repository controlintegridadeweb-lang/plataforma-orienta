import type { Cursor, OrientaPdfDocument } from "../document";
import { contentWidth, reportTheme } from "../theme";
import { drawKpiTile } from "../helpers";

export function renderEvidencesSection(doc: OrientaPdfDocument): Cursor {
  let cur = doc.beginMajorSection(
    "Evidências",
    "Situação documental e fluxo de validação.",
    "evidences",
  );

  const e = doc.data.evidence;
  const w = contentWidth();
  const gap = 10;
  const tileW = (w - gap * 3) / 4;
  const tileH = 64;
  cur = doc.ensureBlock(cur, tileH + 24);
  const rowY = cur.y;

  const tiles = [
    { label: "Total", value: String(e.total), accent: reportTheme.slate500 },
    { label: "Aprovadas", value: String(e.approved), accent: reportTheme.emerald },
    { label: "Aguardando", value: String(e.pending), accent: reportTheme.amber },
    { label: "Rejeitadas", value: String(e.rejected), accent: reportTheme.rose },
  ] as const;

  tiles.forEach((t, i) => {
    drawKpiTile(doc, cur, {
      label: t.label,
      value: t.value,
      x: reportTheme.margin + i * (tileW + gap),
      y: rowY,
      w: tileW,
      h: tileH,
      accent: t.accent,
    });
  });

  cur = { page: cur.page, y: rowY - tileH - 24 };

  if (e.complementation > 0) {
    const h = 52;
    const card = doc.drawRoundedCard(cur, h, { fill: reportTheme.amberBg, border: reportTheme.amber });
    card.cursor.page.drawText("Complementações solicitadas", {
      x: card.innerX,
      y: card.innerY,
      size: 10,
      font: doc.fonts.bold,
      color: reportTheme.amber,
    });
    card.cursor.page.drawText(
      `${e.complementation} evidência(s) aguardam complementação.`,
      {
        x: card.innerX,
        y: card.innerY - 18,
        size: 9,
        font: doc.fonts.regular,
        color: reportTheme.slate700,
        maxWidth: card.innerW,
      },
    );
    cur = { page: card.cursor.page, y: card.cursor.y - 16 };
  }

  const rate = e.total > 0 ? Math.round((e.approved / e.total) * 100) : 0;
  cur = doc.drawParagraph(
    cur,
    e.total === 0
      ? "Nenhuma evidência enviada para este formulário."
      : `Taxa de aprovação: ${rate}% do total enviado.`,
    { size: 9, gap: 8 },
  );

  return cur;
}
