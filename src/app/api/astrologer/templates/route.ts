import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import {
  TemplateError,
  createTemplate,
  listTemplates,
} from "@/backend/services/consult-template.service";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";

export async function GET() {
  try {
    const me = await requireRole("ASTROLOGER");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const data = await listTemplates(profile.id);
    return NextResponse.json(data);
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    if (err instanceof TemplateError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
});

export async function POST(req: NextRequest) {
  try {
    const me = await requireRole("ASTROLOGER");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const body = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation failed", details: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }
    const tpl = await createTemplate(profile.id, parsed.data);
    return NextResponse.json({ template: tpl }, { status: 201 });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    if (err instanceof TemplateError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
