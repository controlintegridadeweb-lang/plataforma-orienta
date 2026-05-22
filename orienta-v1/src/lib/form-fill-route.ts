/** Rotas de preenchimento ativo (respondente ou analista em nome da org). */
const FORM_FILL_PATH = /^\/(respondente|analista)\/formularios\/[^/]+$/;

export function isFormFillRoute(pathname: string): boolean {
  return FORM_FILL_PATH.test(pathname);
}
