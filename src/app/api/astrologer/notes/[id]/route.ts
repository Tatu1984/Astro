import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import {
  ClientNoteError,
  deleteNote,
  updateNote,
} from "@/backend/services/client-note.service";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";

const PatchSchema = z.object({
  content: z.string().min(1).max(10_000),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireRole("ASTROLOGER");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation failed", details: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }
    const note = await updateNote(profile.id, id, parsed.data.content);
    return NextResponse.json({ note });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    if (err instanceof ClientNoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireRole("ASTROLOGER");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const { id } = await params;
    await deleteNote(profile.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    if (err instanceof ClientNoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
