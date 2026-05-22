import type { OfficialReportData } from "@/lib/report/build-official-report-data";
import { buildOfficialReportPdfDocument } from "@/lib/report/pdf/build-official-report";

/** Gera o PDF oficial institucional a partir do payload consolidado. */
export async function buildOfficialReportPdf(payload: OfficialReportData): Promise<Uint8Array> {
  return buildOfficialReportPdfDocument(payload);
}
