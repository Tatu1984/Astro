import { headers } from "next/headers";

import { auth } from "@/auth";
import { verifyUserToken } from "@/backend/auth/jwt";

export type AuthedUser = {
  userId: string;
  role: string;
};

/**
 * Resolves the current user from either:
 *  - `Authorization: Bearer <jwt>` header (mobile / API clients), or
 *  - NextAuth cookie session (browser).
 *
 * Bearer wins if present and valid. Returns null if both fail.
 */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const h = await headers();
  const authz = h.get("authorization") ?? h.get("Authorization");
  if (authz && authz.toLowerCase().startsWith("bearer ")) {
    const token = authz.slice(7).trim();
    if (token) {
      const payload = await verifyUserToken(token);
      if (payload) return payload;
    }
  }

  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, role: session.user.role ?? "USER" };
  }
  return null;
}
