import { NextResponse } from "next/server";
import {
  FormsConflictError,
  FormsNotFoundError,
  FormsValidationError,
} from "./admin-service";
import { FormsExportUnavailable } from "./answers-export";

export function handleFormsError(error: unknown): NextResponse {
  if (error instanceof FormsValidationError) {
    return NextResponse.json(
      { error: error.message, issues: error.issues },
      { status: 400 },
    );
  }
  if (error instanceof FormsNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof FormsConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof FormsExportUnavailable) {
    return NextResponse.json({ error: error.message }, { status: 501 });
  }
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: message }, { status: 500 });
}
