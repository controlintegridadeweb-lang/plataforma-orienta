import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import {
  LibraryService,
  LibraryValidationError,
} from "@/lib/library/service";
import { handleLibraryError, parseCatalogEntityParam } from "@/lib/library/http";
import { logError } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ entity: string; id: string }> };

const idSchema = z.string().uuid();

const transitionSchema = z.object({
  action: z.enum([
    "submit_for_review",
    "return_review",
    "publish",
    "deprecate",
    "archive",
  ]),
  justification: z.string().trim().min(5).max(2000).optional().nullable(),
  reviewerUserId: z.string().uuid().optional().nullable(),
});

function parseIdParam(value: string) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new LibraryValidationError([
      { path: "id", message: "Identificador invalido." },
    ]);
  }
  return parsed.data;
}

export async function POST(request: Request, context: RouteContext) {
  const { context: authContext, error: authError } = await requireAuth(request, ["admin", "analyst"]);
  if (authError) return authError;

  try {
    const { entity: rawEntity, id: rawId } = await context.params;
    const entity = parseCatalogEntityParam(rawEntity);
    const id = parseIdParam(rawId);
    const body = await request.json().catch(() => ({}));
    const parsed = transitionSchema.safeParse(body);
    if (!parsed.success) {
      throw new LibraryValidationError(
        parsed.error.issues.map((issue) => ({
          path: issue.path.join(".") || "_",
          message: issue.message,
        })),
      );
    }

    const service = new LibraryService();
    const actor = {
      userId: authContext?.userId ?? null,
      justification: parsed.data.justification ?? null,
      reviewerUserId: parsed.data.reviewerUserId ?? null,
    };

    let item;
    switch (parsed.data.action) {
      case "submit_for_review":
        item = await service.submitForReview(entity, id, actor);
        break;
      case "return_review":
        item = await service.returnReview(entity, id, actor);
        break;
      case "publish":
        item = await service.publish(entity, id, actor);
        break;
      case "deprecate":
        item = await service.deprecate(entity, id, actor);
        break;
      case "archive":
        item = await service.archive(entity, id, actor);
        break;
    }

    return NextResponse.json({ item });
  } catch (error) {
    logError("Failed to transition library item", error, {
      route: "/api/admin/library/:entity/:id/transitions",
    });
    return handleLibraryError(error);
  }
}
