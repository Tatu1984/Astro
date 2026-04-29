import { NextResponse } from "next/server";
import { z, type ZodError } from "zod";

import { AuthError } from "@/backend/auth/requireRole";

type Statused = { status: number; message: string };

function isStatused(err: unknown): err is Statused {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { status?: unknown }).status === "number" &&
    typeof (err as { message?: unknown }).message === "string"
  );
}

export function apiError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (isStatused(err)) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[api]", err);
  return NextResponse.json(
    { error: "internal error", detail: err instanceof Error ? err.message : String(err) },
    { status: 500 },
  );
}

export function validationError(err: ZodError): NextResponse {
  return NextResponse.json(
    { error: "validation failed", details: z.treeifyError(err) },
    { status: 400 },
  );
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw { status: 400, message: "invalid JSON body" };
  }
}
