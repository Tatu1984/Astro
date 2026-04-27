import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listUsers } from "@/backend/services/admin.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const users = await listUsers();
  return NextResponse.json({ users });
}
