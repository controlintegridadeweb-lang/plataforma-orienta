import { NextResponse } from "next/server";
import {
  RecommendationsConflictError,
  RecommendationsNotFoundError,
  RecommendationsValidationError,
} from "./admin-service";

export function handleRecommendationsError(error: unknown): NextResponse {
  if (error instanceof RecommendationsValidationError) {
    return NextResponse.json(
      { error: error.message, issues: error.issues },
      { status: 400 },
    );
  }
  if (error instanceof RecommendationsNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof RecommendationsConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: message }, { status: 500 });
}
