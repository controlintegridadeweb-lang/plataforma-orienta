import { NextResponse } from "next/server";
import {
  LibraryConflictError,
  LibraryValidationError,
  type ValidationIssue,
} from "./service";
import { libraryCatalogEntitySchema, libraryEntitySchema } from "./schemas";
import type { LibraryCatalogEntity, LibraryEntity } from "./types";

export function parseEntityParam(value: string): LibraryEntity {
  const parsed = libraryEntitySchema.safeParse(value);
  if (!parsed.success) {
    throw new LibraryValidationError([
      { path: "entity", message: "Entidade da biblioteca invalida." },
    ]);
  }
  return parsed.data as LibraryEntity;
}

/** Biblioteca Geral (admin): eixos, seções, modelos de recomendação e planos de ação. */
export function parseCatalogEntityParam(value: string): LibraryCatalogEntity {
  const parsed = libraryCatalogEntitySchema.safeParse(value);
  if (!parsed.success) {
    throw new LibraryValidationError([
      {
        path: "entity",
        message:
          "Entidade inválida. Use axes, sections, recommendations ou actions. Métricas por resposta ficam em Formulários → Vínculos.",
      },
    ]);
  }
  return parsed.data as LibraryCatalogEntity;
}

export function handleLibraryError(error: unknown): NextResponse {
  if (error instanceof LibraryValidationError) {
    return NextResponse.json(
      { error: error.message, issues: error.issues satisfies ValidationIssue[] },
      { status: 400 },
    );
  }
  if (error instanceof LibraryConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: message }, { status: 500 });
}
