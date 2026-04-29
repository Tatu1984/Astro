import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { signUserToken, verifyUserToken } from "@/backend/auth/jwt";

export async function POST() {
  const h = await headers();
  const authz = h.get("authorization") ?? h.get("Authorization");
  if (!authz || !authz.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "bearer token required" }, { status: 401 });
  }

  const token = authz.slice(7).trim();
  if (!token) return NextResponse.json({ error: "bearer token required" }, { status: 401 });

  const payload = await verifyUserToken(token);
  if (!payload) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const newToken = await signUserToken({ userId: payload.userId, role: payload.role });
  return NextResponse.json({ token: newToken });
}
