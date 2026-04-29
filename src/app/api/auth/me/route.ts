import { NextResponse } from "next/server";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { prisma } from "@/backend/database/client";

export async function GET() {
  const me = await getAuthedUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: me.userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({ user });
}
