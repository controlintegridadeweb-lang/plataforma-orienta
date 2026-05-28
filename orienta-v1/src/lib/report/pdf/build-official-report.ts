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

  renderExecutiveSummary(doc);
  renderFamiSection(doc);
  renderRecommendationsSection(doc);
  renderActionPlanSection(doc);
  renderEvidencesSection(doc);
  renderEvolutionSection(doc);
  renderConclusionSection(doc);

  fillTableOfContents(doc);
  doc.applyFooters();

  return doc.pdf.save();
}
