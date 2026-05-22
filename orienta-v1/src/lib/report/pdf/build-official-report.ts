import type { OfficialReportData } from "@/lib/report/build-official-report-data";
import { OrientaPdfDocument } from "./document";
import { renderCoverPage } from "./sections/cover-page";
import { fillTableOfContents } from "./sections/table-of-contents";
import { renderExecutiveSummary } from "./sections/executive-summary";
import { renderFamiSection } from "./sections/fami-section";
import { renderRecommendationsSection } from "./sections/recommendations-section";
import { renderActionPlanSection } from "./sections/action-plan-section";
import { renderEvidencesSection } from "./sections/evidences-section";
import { renderEvolutionSection } from "./sections/evolution-section";
import { renderConclusionSection } from "./sections/conclusion-section";

/**
 * PDF institucional: capa → sumário → seções em páginas dedicadas → rodapé discreto.
 */
export async function buildOfficialReportPdfDocument(
  payload: OfficialReportData,
): Promise<Uint8Array> {
  const doc = await OrientaPdfDocument.create(payload);

  renderCoverPage(doc);
  doc.reserveTocPage();

  let c = renderExecutiveSummary(doc);
  c = renderFamiSection(doc, c);
  c = renderRecommendationsSection(doc, c);
  c = renderActionPlanSection(doc, c);
  c = renderEvidencesSection(doc, c);
  c = renderEvolutionSection(doc, c);
  renderConclusionSection(doc, c);

  fillTableOfContents(doc);
  doc.applyFooters();

  return doc.pdf.save();
}
