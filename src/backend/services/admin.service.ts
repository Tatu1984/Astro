import type { UserRole } from "@prisma/client";

import { prisma } from "@/backend/database/client";

export class AdminError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AdminError";
  }
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  createdAt: Date;
}

export async function listUsers(): Promise<AdminUserRow[]> {
  return prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

const PROMOTABLE_ROLES = new Set<UserRole>(["USER", "ASTROLOGER"]);

/**
 * Admins can move users between USER and ASTROLOGER. Promotion to ADMIN is
 * intentionally not exposed via API — done manually in DB / seed only.
 */
export async function setUserRole(args: {
  actingUserId: string;
  targetUserId: string;
  newRole: UserRole;
}) {
  if (!PROMOTABLE_ROLES.has(args.newRole)) {
    throw new AdminError(400, `role ${args.newRole} not assignable via this endpoint`);
  }
  if (args.actingUserId === args.targetUserId) {
    throw new AdminError(400, "you cannot change your own role");
  }

  const target = await prisma.user.findUnique({ where: { id: args.targetUserId } });
  if (!target) throw new AdminError(404, "user not found");
  if (target.role === "ADMIN") throw new AdminError(400, "cannot demote an ADMIN");

  return prisma.user.update({
    where: { id: args.targetUserId },
    data: { role: args.newRole },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}
