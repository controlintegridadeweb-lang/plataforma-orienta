import { getCalendarYearBrt } from "./fami-year";

export type GlobalFamiRowLite = {
  processingVersion: number;
  createdAt: string;
  percentage: number;
  maturityLevel: number;
};

/**
 * Agrupa snapshots globais por ano civil BRT; em cada ano fica o maior processing_version,
 * empate pelo created_at mais recente (mesma regra que `resolveYearEndFamiVersion`).
 */
export function pickBestGlobalPerBrtYear(rows: GlobalFamiRowLite[]): GlobalFamiRowLite[] {
  const bestByYear = new Map<number, GlobalFamiRowLite>();
  for (const row of rows) {
    if (!row.createdAt) continue;
    const year = getCalendarYearBrt(row.createdAt);
    const cur = bestByYear.get(year);
    if (
      !cur ||
      row.processingVersion > cur.processingVersion ||
      (row.processingVersion === cur.processingVersion && row.createdAt > cur.createdAt)
    ) {
      bestByYear.set(year, row);
    }
  }
  return Array.from(bestByYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([, row]) => row);
}
