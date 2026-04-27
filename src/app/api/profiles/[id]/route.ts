import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { ProfileError, softDeleteProfile } from "@/backend/services/profile.service";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const result = await softDeleteProfile(id, session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ProfileError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
