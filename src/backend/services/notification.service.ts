import type { NotificationKind, Prisma } from "@prisma/client";

import { prisma } from "@/backend/database/client";

export class NotificationError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "NotificationError";
  }
}

export interface NotifyInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  payload?: Prisma.InputJsonValue;
}

/**
 * Best-effort: never throws — a notification is auxiliary to the action
 * that triggers it. Email/SMS delivery is unimplemented and intentionally
 * stubbed; this only persists the in-app row.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        payload: input.payload,
      },
    });
  } catch (err) {
    console.warn("[notification.service] failed to persist Notification", err);
  }
}

export interface ListArgs {
  unread?: boolean;
  limit?: number;
  offset?: number;
}

export async function listForUser(userId: string, args: ListArgs = {}) {
  const limit = Math.min(Math.max(args.limit ?? 25, 1), 100);
  const offset = Math.max(args.offset ?? 0, 0);
  const where: Prisma.NotificationWhereInput = { userId };
  if (args.unread) where.readAt = null;

  const [rows, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { rows, total, unread, limit, offset };
}

export async function markRead(userId: string, notificationId: string) {
  const found = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!found) throw new NotificationError(404, "notification not found");
  if (found.userId !== userId) throw new NotificationError(403, "forbidden");
  if (found.readAt) return found;
  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
