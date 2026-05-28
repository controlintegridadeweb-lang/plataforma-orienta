import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import {
  FormsAnswersService,
  parseStatusFilter,
} from "@/lib/forms/answers-service";
import { FormsValidationError } from "@/lib/forms/admin-service";
import {
  RESPONDENT_LIST_MAX_LIMIT,
  type AnswersListFilters,
} from "@/lib/forms/answers-types";
import {
  buildAnswersCsv,
  buildAnswersPdf,
  buildAnswersXlsx,
  type ExportPayload,
} from "@/lib/forms/answers-export";
import { handleFormsError } from "@/lib/forms/http";
import { logError } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ formId: string }> };

const idSchema = z.string().uuid();
const formatSchema = z.enum(["csv", "pdf", "xlsx"]);

function parseId(value: string, path = "formId"): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new FormsValidationError([
      { path, message: `${path} invalido.` },
    ]);
  }
  return parsed.data;
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

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function GET(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;
  try {
    const { formId: raw } = await context.params;
    const formId = parseId(raw);

    const url = new URL(request.url);
    const sp = url.searchParams;

    const formatResult = formatSchema.safeParse(sp.get("format"));
    if (!formatResult.success) {
      throw new FormsValidationError([
        { path: "format", message: "format deve ser csv, pdf ou xlsx." },
      ]);
    }
    const format = formatResult.data;

    const filters: AnswersListFilters = {
      organizationId: sp.get("organizationId")
        ? parseId(sp.get("organizationId")!, "organizationId")
        : null,
      status: parseStatusFilter(sp.get("status")),
      from: parseIsoDate(sp.get("from"), "from"),
      to: parseIsoDate(sp.get("to"), "to"),
    };

    const service = new FormsAnswersService();
    const [overview, summary, listPage] = await Promise.all([
      service.getOverview(formId),
      service.getSummary(formId),
      service.listRespondents(formId, {
        ...filters,
        limit: RESPONDENT_LIST_MAX_LIMIT,
      }),
    ]);

    const payload: ExportPayload = {
      form: { id: formId, name: overview.formName },
      overview,
      summary,
      respondents: listPage.rows,
      generatedAtIso: new Date().toISOString(),
    };

    const baseName = `respostas-${sanitizeFileName(overview.formName) || formId}`;

    if (format === "csv") {
      const csv = buildAnswersCsv(payload);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseName}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (format === "pdf") {
      const bytes = await buildAnswersPdf(payload);
      return new Response(new Uint8Array(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // xlsx: stub, sempre lanca FormsExportUnavailable -> 501.
    buildAnswersXlsx(payload);
    return NextResponse.json(
      { error: "Formato nao implementado." },
      { status: 501 },
    );
  } catch (error) {
    logError("Failed to export answers", error, {
      route: "/api/admin/forms/:formId/answers/export",
    });
    return handleFormsError(error);
  }
}
