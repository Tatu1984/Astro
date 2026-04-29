import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  AstrologerSignupError,
  signupAstrologer,
} from "@/backend/services/astrologer-signup.service";
import { AstrologerSignupSchema } from "@/backend/validators/astrologer-signup.validator";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = AstrologerSignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const result = await signupAstrologer(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof AstrologerSignupError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
