import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Injeta pathname para titulos SSR no shell (cabecalho alinhado a rota sem depender apenas do cliente).
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/analista",
    "/analista/:path*",
    "/respondente",
    "/respondente/:path*",
  ],
};
