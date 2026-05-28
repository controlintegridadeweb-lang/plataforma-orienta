import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { isGlobalAdmin } from "@/lib/auth/scope";
import { ExceptionsService } from "@/lib/library/exceptions-service";
import { handleLibraryError } from "@/lib/library/http";
import { logError } from "@/lib/observability/logger";

export async function POST(request: Request) {
  const { context: authContext, error: authError } = await requireAuth(request, [
    "admin",
    "respondent",
  ]);
  if (authError) return authError;

  try {
    const body = await request.json();
    const userOrgId = authContext?.organizationId ?? null;

    if (authContext && !isGlobalAdmin(authContext)) {
      const bodyOrgId = typeof body?.organizationId === "string" ? body.organizationId : null;
      if (!userOrgId) {
        return NextResponse.json(
          { error: "Perfil sem organizacao vinculada." },
          { status: 403 },
        );
      }
      if (bodyOrgId && bodyOrgId !== userOrgId) {
        return NextResponse.json(
          { error: "Nao autorizado a abrir excecao em outra organizacao." },
          { status: 403 },
        );
      }
      body.organizationId = userOrgId;
    }

    const service = new ExceptionsService();
    const result = await service.request(body, {
      userId: authContext?.userId ?? null,
    });
    return NextResponse.json({ exception: result }, { status: 201 });
  } catch (error) {
    logError("Failed to request recommendation exception", error, {
      route: "/api/admin/library/exceptions",
    });
    return handleLibraryError(error);
  }
}

export async function GET(request: Request) {
  const { context: authContext, error: authError } = await requireAuth(request, [
    "admin",
  ]);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const requestedOrg = url.searchParams.get("organizationId");
    const userOrgId = authContext?.organizationId ?? null;

    if (!requestedOrg) {
      return NextResponse.json(
        { error: "organizationId obrigatorio." },
        { status: 400 },
      );
    }

    if (authContext && !isGlobalAdmin(authContext) && requestedOrg !== userOrgId) {
      return NextResponse.json(
        { error: "Nao autorizado a listar excecoes de outra organizacao." },
        { status: 403 },
      );
    }

    const service = new ExceptionsService();
    const rows = await service.listByOrg(requestedOrg);
    return NextResponse.json({ exceptions: rows });
  } catch (error) {
    logError("Failed to list recommendation exceptions", error, {
      route: "/api/admin/library/exceptions",
    });
    return handleLibraryError(error);
  }
}
