import { NextResponse } from "next/server";
import {
  ActionPlansNotFoundError,
  ActionPlansValidationError,
} from "./admin-service";

export function handleActionPlansError(error: unknown): NextResponse {
  if (error instanceof ActionPlansValidationError) {
    return NextResponse.json(
      { error: error.message, issues: error.issues },
      { status: 400 },
    );
  }
  if (error instanceof ActionPlansNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: message }, { status: 500 });
}
