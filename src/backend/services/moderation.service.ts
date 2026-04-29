import type { ModerationKind, Prisma } from "@prisma/client";

import { prisma } from "@/backend/database/client";
import { writeAuditTx } from "@/backend/services/audit.service";
import { notify } from "@/backend/services/notification.service";

export class ModerationError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ModerationError";
  }
}

const AUDIT_RESOURCE = {
  POST: "post",
  COMMENT: "comment",
  USER: "user",
} as const;

async function recordAction(
  tx: Prisma.TransactionClient,
  args: {
    kind: ModerationKind;
    targetType: "POST" | "COMMENT" | "USER";
    targetId: string;
    moderatorId: string;
    reason?: string | null;
    expiresAt?: Date | null;
  },
) {
  const action = await tx.moderationAction.create({
    data: {
      kind: args.kind,
      targetType: args.targetType,
      targetId: args.targetId,
      moderatorId: args.moderatorId,
      reason: args.reason ?? null,
      expiresAt: args.expiresAt ?? null,
    },
  });
  await writeAuditTx(tx, {
    kind: `MODERATION_${args.kind}`,
    actorUserId: args.moderatorId,
    resourceType: AUDIT_RESOURCE[args.targetType],
    resourceId: args.targetId,
    payload: {
      reason: args.reason ?? null,
      expiresAt: args.expiresAt?.toISOString() ?? null,
      actionId: action.id,
    },
  });
  return action;
}

export async function hidePost(moderatorId: string, postId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: { id: true, deletedAt: true, hiddenAt: true },
    });
    if (!post || post.deletedAt) throw new ModerationError(404, "post not found");
    await tx.post.update({
      where: { id: postId },
      data: { hiddenAt: post.hiddenAt ?? new Date(), hiddenByUserId: moderatorId },
    });
    await recordAction(tx, {
      kind: "HIDE_POST",
      targetType: "POST",
      targetId: postId,
      moderatorId,
      reason,
    });
    return { ok: true };
  });
}

export async function deletePost(moderatorId: string, postId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: { id: true, deletedAt: true },
    });
    if (!post) throw new ModerationError(404, "post not found");
    await tx.post.update({
      where: { id: postId },
      data: {
        deletedAt: post.deletedAt ?? new Date(),
        hiddenAt: new Date(),
        hiddenByUserId: moderatorId,
      },
    });
    await recordAction(tx, {
      kind: "DELETE_POST",
      targetType: "POST",
      targetId: postId,
      moderatorId,
      reason,
    });
    return { ok: true };
  });
}

export async function restorePost(moderatorId: string, postId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new ModerationError(404, "post not found");
    await tx.post.update({
      where: { id: postId },
      data: { hiddenAt: null, hiddenByUserId: null, deletedAt: null },
    });
    await recordAction(tx, {
      kind: "RESTORE",
      targetType: "POST",
      targetId: postId,
      moderatorId,
      reason,
    });
    return { ok: true };
  });
}

export async function hideComment(moderatorId: string, commentId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const c = await tx.comment.findUnique({
      where: { id: commentId },
      select: { id: true, deletedAt: true, hiddenAt: true },
    });
    if (!c || c.deletedAt) throw new ModerationError(404, "comment not found");
    await tx.comment.update({
      where: { id: commentId },
      data: { hiddenAt: c.hiddenAt ?? new Date(), hiddenByUserId: moderatorId },
    });
    await recordAction(tx, {
      kind: "HIDE_COMMENT",
      targetType: "COMMENT",
      targetId: commentId,
      moderatorId,
      reason,
    });
    return { ok: true };
  });
}

export async function deleteComment(moderatorId: string, commentId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const c = await tx.comment.findUnique({
      where: { id: commentId },
      select: { id: true, deletedAt: true },
    });
    if (!c) throw new ModerationError(404, "comment not found");
    await tx.comment.update({
      where: { id: commentId },
      data: {
        deletedAt: c.deletedAt ?? new Date(),
        hiddenAt: new Date(),
        hiddenByUserId: moderatorId,
      },
    });
    await recordAction(tx, {
      kind: "DELETE_COMMENT",
      targetType: "COMMENT",
      targetId: commentId,
      moderatorId,
      reason,
    });
    return { ok: true };
  });
}

export async function restoreComment(moderatorId: string, commentId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const c = await tx.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!c) throw new ModerationError(404, "comment not found");
    await tx.comment.update({
      where: { id: commentId },
      data: { hiddenAt: null, hiddenByUserId: null, deletedAt: null },
    });
    await recordAction(tx, {
      kind: "RESTORE",
      targetType: "COMMENT",
      targetId: commentId,
      moderatorId,
      reason,
    });
    return { ok: true };
  });
}

const FAR_FUTURE = new Date("9999-12-31T23:59:59Z");

export async function banUser(
  moderatorId: string,
  userId: string,
  durationHours: number,
  reason?: string,
) {
  if (moderatorId === userId) throw new ModerationError(400, "cannot ban yourself");

  const isPerm = !Number.isFinite(durationHours) || durationHours <= 0;
  const kind: ModerationKind = isPerm ? "BAN_USER_PERM" : "BAN_USER_24H";
  const expiresAt = isPerm ? FAR_FUTURE : new Date(Date.now() + durationHours * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, deletedAt: true },
    });
    if (!target || target.deletedAt) throw new ModerationError(404, "user not found");
    if (target.role === "ADMIN") throw new ModerationError(400, "cannot ban an ADMIN");

    await tx.user.update({
      where: { id: userId },
      data: { bannedUntil: expiresAt },
    });
    await recordAction(tx, {
      kind,
      targetType: "USER",
      targetId: userId,
      moderatorId,
      reason,
      expiresAt,
    });
    void notify({
      userId,
      kind: "MODERATION_ACTION",
      title: isPerm ? "Your account has been banned" : "Your account is temporarily restricted",
      body: reason ?? "Contact support if you believe this is in error.",
      payload: { kind, expiresAt: expiresAt.toISOString() },
    });
    return { ok: true, bannedUntil: expiresAt.toISOString() };
  });
}

export async function unbanUser(moderatorId: string, userId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });
    if (!target || target.deletedAt) throw new ModerationError(404, "user not found");
    await tx.user.update({
      where: { id: userId },
      data: { bannedUntil: null },
    });
    await recordAction(tx, {
      kind: "UNBAN",
      targetType: "USER",
      targetId: userId,
      moderatorId,
      reason,
    });
    return { ok: true };
  });
}

export type ModerationQueueKind = "POSTS" | "COMMENTS" | "USERS";

export interface ListQueueArgs {
  kind?: ModerationQueueKind;
  limit?: number;
  offset?: number;
}

export async function listModerationQueue(args: ListQueueArgs = {}) {
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
  const offset = Math.max(args.offset ?? 0, 0);
  const queueKind = args.kind ?? "POSTS";

  if (queueKind === "POSTS") {
    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, email: true, name: true } },
          hiddenBy: { select: { id: true, email: true, name: true } },
          _count: { select: { comments: true, reactions: true } },
        },
      }),
      prisma.post.count(),
    ]);
    return { kind: queueKind, rows, total, limit, offset };
  }

  if (queueKind === "COMMENTS") {
    const [rows, total] = await Promise.all([
      prisma.comment.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, email: true, name: true } },
          hiddenBy: { select: { id: true, email: true, name: true } },
          post: { select: { id: true, body: true } },
        },
      }),
      prisma.comment.count(),
    ]);
    return { kind: queueKind, rows, total, limit, offset };
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        bannedUntil: { not: null, gte: since },
      },
      orderBy: { bannedUntil: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bannedUntil: true,
        createdAt: true,
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        bannedUntil: { not: null, gte: since },
      },
    }),
  ]);
  return { kind: queueKind, rows, total, limit, offset };
}
