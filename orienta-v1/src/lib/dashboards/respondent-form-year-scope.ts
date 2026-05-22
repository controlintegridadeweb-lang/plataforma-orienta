import { getCalendarYearBrt } from "@/lib/fami/fami-year";

/**
 * Um formulario entra no dashboard do respondente para o ano Y quando a organizacao
 * tem atividade registrada naquele periodo civil (BRT): resposta atualizada no ano
 * ou validacao de evidencia no ano (mesmo que a resposta seja anterior).
 */
export function formQualifiesForRespondentDashboardYear(
  responsesUpdatedInPeriod: number,
  validationsInPeriod: number,
): boolean {
  return responsesUpdatedInPeriod > 0 || validationsInPeriod > 0;
}

/**
 * Regra composta do filtro anual: atividade no periodo OU formulario publicado no ano
 * sem nenhuma resposta da organizacao (permite iniciar o preenchimento no ano de criacao).
 */
export function shouldShowFormOnRespondentDashboardForYear(input: {
  periodYear: number;
  responsesUpdatedInPeriod: number;
  validationsInPeriod: number;
  totalResponsesEver: number;
  formCreatedAtIso: string;
}): boolean {
  if (
    formQualifiesForRespondentDashboardYear(
      input.responsesUpdatedInPeriod,
      input.validationsInPeriod,
    )
  ) {
    return true;
  }
  if (input.totalResponsesEver > 0) return false;
  return getCalendarYearBrt(input.formCreatedAtIso) === input.periodYear;
}
