import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { FormsAdminService, FormsValidationError } from "@/lib/forms/admin-service";
import { handleFormsError } from "@/lib/forms/http";
import { logError } from "@/lib/observability/logger";

export async function GET(request: Request) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;
  try {
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const service = new FormsAdminService();
    const forms = await service.list({ includeArchived });
    return NextResponse.json({ forms });
  } catch (error) {
    logError("Failed to list forms", error, { route: "/api/admin/forms" });
    return handleFormsError(error);
  }
}

export async function POST(request: Request) {
  const { context: authContext, error: authError } = await requireAuth(request, [
    "admin",
  ]);
  if (authError) return authError;
  try {
    if (!authContext?.userId) {
      throw new FormsValidationError([
        { path: "_", message: "Autenticacao obrigatoria para criar formulario." },
      ]);
    }
    const payload = await request.json();
    const service = new FormsAdminService();
    const form = await service.create(payload, { userId: authContext.userId });
    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    logError("Failed to create form", error, { route: "/api/admin/forms" });
    return handleFormsError(error);
  }
}
