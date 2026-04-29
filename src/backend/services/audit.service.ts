import type { Prisma } from "@prisma/client";

import { prisma } from "@/backend/database/client";

export interface WriteAuditInput {
  kind: string;
  actorUserId?: string | null;
  resourceType: string;
  resourceId?: string | null;
  payload?: Prisma.InputJsonValue;
  ip?: string | null;
}

export async function writeAudit(input: WriteAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        kind: input.kind,
        actorId: input.actorUserId ?? null,
        resource: input.resourceType,
        resourceId: input.resourceId ?? null,
        payload: input.payload,
        ip: input.ip ?? null,
      },
    });
  } catch (err) {
    console.warn("[audit.service] failed to persist AuditLog", err);
  }
}

export async function writeAuditTx(
  tx: Prisma.TransactionClient,
  input: WriteAuditInput,
): Promise<void> {
  try {
    await tx.auditLog.create({
      data: {
        kind: input.kind,
        actorId: input.actorUserId ?? null,
        resource: input.resourceType,
        resourceId: input.resourceId ?? null,
        payload: input.payload,
        ip: input.ip ?? null,
      },
    });
  } catch (err) {
    console.warn("[audit.service] failed to persist AuditLog (tx)", err);
  }
}

export interface ListAuditLogsArgs {
  kind?: string;
  actorUserId?: string;
  resourceType?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export async function listAuditLogs(args: ListAuditLogsArgs) {
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
  const offset = Math.max(args.offset ?? 0, 0);

  const where: Prisma.AuditLogWhereInput = {};
  if (args.kind) where.kind = args.kind;
  if (args.actorUserId) where.actorId = args.actorUserId;
  if (args.resourceType) where.resource = args.resourceType;
  if (args.fromDate || args.toDate) {
    where.createdAt = {};
    if (args.fromDate) where.createdAt.gte = args.fromDate;
    if (args.toDate) where.createdAt.lte = args.toDate;
  }

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        actor: { select: { id: true, email: true, name: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { rows, total, limit, offset };
}

export async function listAuditKinds(): Promise<string[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.auditLog.findMany({
    where: { createdAt: { gte: since } },
    distinct: ["kind"],
    select: { kind: true },
    orderBy: { kind: "asc" },
  });
  return rows.map((r) => r.kind);
}

export async function listAuditResourceTypes(): Promise<string[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.auditLog.findMany({
    where: { createdAt: { gte: since } },
    distinct: ["resource"],
    select: { resource: true },
    orderBy: { resource: "asc" },
  });
  return rows.map((r) => r.resource);
}
