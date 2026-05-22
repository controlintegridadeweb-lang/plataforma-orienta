import { NextResponse } from "next/server";

export function assertDevOnly() {
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  return NextResponse.json(
    { error: "Endpoint disponivel apenas em ambiente de desenvolvimento." },
    { status: 403 },
  );
}
