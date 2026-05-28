/** Rotas de preenchimento ativo do respondente. */
const FORM_FILL_PATH = /^\/respondente\/formularios\/[^/]+$/;

export function isFormFillRoute(pathname: string): boolean {
  return FORM_FILL_PATH.test(pathname);
}
