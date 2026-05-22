import { NextResponse } from "next/server";
import {
  EvidencesConflictError,
  EvidencesNotFoundError,
  EvidencesValidationError,
} from "./admin-service";

export function handleEvidencesError(error: unknown): NextResponse {
  if (error instanceof EvidencesValidationError) {
    return NextResponse.json(
      { error: error.message, issues: error.issues },
      { status: 400 },
    );
  }
  if (error instanceof EvidencesNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof EvidencesConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: message }, { status: 500 });
}
