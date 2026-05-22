import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import {
  FormsAnswersService,
  parseStatusFilter,
} from "@/lib/forms/answers-service";
import { FormsValidationError } from "@/lib/forms/admin-service";
import { handleFormsError } from "@/lib/forms/http";
import { logError } from "@/lib/observability/logger";
import type {
  AnswersListFilters,
  RespondentListCursor,
} from "@/lib/forms/answers-types";

type RouteContext = { params: Promise<{ formId: string }> };

const idSchema = z.string().uuid();

function parseId(value: string, path = "formId"): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new FormsValidationError([
      { path, message: `${path} invalido.` },
    ]);
  }
  return parsed.data;
}

function parseLimit(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) {
    throw new FormsValidationError([
      { path: "limit", message: "limit deve ser um numero positivo." },
    ]);
  }
  return Math.floor(num);
}

function parseIsoDate(raw: string | null, path: string): string | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) {
    throw new FormsValidationError([
      { path, message: `${path} deve ser uma data ISO valida.` },
    ]);
  }
  return raw;
}

export async function GET(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin", "analyst"]);
  if (authError) return authError;
  try {
    const { formId: raw } = await context.params;
    const formId = parseId(raw);

    const url = new URL(request.url);
    const sp = url.searchParams;

    const filters: AnswersListFilters = {
      organizationId: sp.get("organizationId")
        ? parseId(sp.get("organizationId")!, "organizationId")
        : null,
      status: parseStatusFilter(sp.get("status")),
      from: parseIsoDate(sp.get("from"), "from"),
      to: parseIsoDate(sp.get("to"), "to"),
    };

    let cursor: RespondentListCursor | null = null;
    const cursorUpdatedAt = sp.get("cursorUpdatedAt");
    const cursorOrganizationId = sp.get("cursorOrganizationId");
    if (cursorUpdatedAt && cursorOrganizationId) {
      const parsedDate = parseIsoDate(cursorUpdatedAt, "cursorUpdatedAt");
      const parsedOrg = parseId(cursorOrganizationId, "cursorOrganizationId");
      if (parsedDate) {
        cursor = { updatedAt: parsedDate, organizationId: parsedOrg };
      }
    }

    const limit = parseLimit(sp.get("limit"));

    const service = new FormsAnswersService();
    const page = await service.listRespondents(formId, {
      ...filters,
      cursor,
      limit,
    });
    return NextResponse.json({ page });
  } catch (error) {
    logError("Failed to list answer respondents", error, {
      route: "/api/admin/forms/:formId/answers/respondents",
    });
    return handleFormsError(error);
  }
}
