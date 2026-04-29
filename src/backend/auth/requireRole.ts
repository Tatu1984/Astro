import { NextResponse } from "next/server";

import { getAuthedUser, type AuthedUser } from "@/backend/auth/getAuthedUser";

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireAuth(): Promise<AuthedUser> {
  const me = await getAuthedUser();
  if (!me) throw new AuthError(401, "unauthorized");
  return me;
}

export async function requireRole(...roles: Array<"USER" | "ASTROLOGER" | "ADMIN" | "MODERATOR">): Promise<AuthedUser> {
  const me = await requireAuth();
  if (!roles.includes(me.role as never)) {
    throw new AuthError(403, "forbidden");
  }
  return me;
}

export function authErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return null;
}
