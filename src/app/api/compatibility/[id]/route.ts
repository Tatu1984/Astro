import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  CompatibilityError,
  deleteCompatibility,
  getCompatibility,
} from "@/backend/services/synastry.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const c = await getCompatibility(session.user.id, id);
    return NextResponse.json({ compatibility: c });
  } catch (err) {
    if (err instanceof CompatibilityError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await deleteCompatibility(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CompatibilityError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
