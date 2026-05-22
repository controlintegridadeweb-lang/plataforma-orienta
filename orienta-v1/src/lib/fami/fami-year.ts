/** Fuso America/Sao_Paulo (sem horario de verao desde 2019); usado para definir ano civil FAMI. */

export const FAMI_CALENDAR_TIMEZONE = "America/Sao_Paulo";

/**
 * Ano civil (YYYY) da data em BRT, para alinhar fechamento anual institucional.
 */
export function getCalendarYearBrt(isoUtc: string): number {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) {
    return new Date().getUTCFullYear();
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FAMI_CALENDAR_TIMEZONE,
    year: "numeric",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  return y ? Number(y) : d.getUTCFullYear();
}

/**
 * Intervalo UTC [from, to] que cobre 1 Jan–31 Dec BRT para o ano pedido,
 * compativel com `timestamptz` no Postgres (.gte /.lte).
 */
export function brtYearUtcBounds(year: number): { fromInclusive: string; toInclusive: string } {
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    throw new RangeError("year");
  }
  const fromInclusive = `${year}-01-01T03:00:00.000Z`;
  const toInclusive = `${year + 1}-01-01T02:59:59.999Z`;
  return { fromInclusive, toInclusive };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Ano civil em BRT para o instante atual. */
export function currentBrtYear(): number {
  return currentBrtMonthYear().year;
}

/** Mês civil (1–12) e ano em BRT para o instante atual. */
export function currentBrtMonthYear(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FAMI_CALENDAR_TIMEZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value ?? new Date().getFullYear());
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 1);
  return { year, month };
}

/**
 * Intervalo UTC [from, to] que cobre o mês civil BRT (month 1–12).
 */
export function brtMonthUtcBounds(
  year: number,
  month: number,
): { fromInclusive: string; toInclusive: string } {
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    throw new RangeError("year");
  }
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    throw new RangeError("month");
  }
  const fromInclusive = `${year}-${pad2(month)}-01T03:00:00.000Z`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const endExclusive = new Date(`${nextYear}-${pad2(nextMonth)}-01T03:00:00.000Z`);
  const toInclusive = new Date(endExclusive.getTime() - 1).toISOString();
  return { fromInclusive, toInclusive };
}

const PT_MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export function brtMonthLabel(month: number): string {
  if (month < 1 || month > 12) return String(month);
  return PT_MONTH_LABELS[month - 1];
}
