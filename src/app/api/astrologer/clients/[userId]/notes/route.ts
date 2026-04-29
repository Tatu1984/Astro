import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import {
  ClientNoteError,
  createNote,
  listNotesForClient,
} from "@/backend/services/client-note.service";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const me = await requireRole("ASTROLOGER");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const { userId } = await params;
    const notes = await listNotesForClient(profile.id, userId);
    return NextResponse.json({ notes });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

const CreateSchema = z.object({
  bookingId: z.string().min(1).max(64).optional(),
  content: z.string().min(1).max(10_000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const me = await requireRole("ASTROLOGER");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const { userId } = await params;
    const body = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation failed", details: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }
    const note = await createNote({
      astrologerProfileId: profile.id,
      userId,
      bookingId: parsed.data.bookingId,
      content: parsed.data.content,
    });
    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    if (err instanceof ClientNoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
