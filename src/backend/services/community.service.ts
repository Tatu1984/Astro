import type { PostVisibility, Prisma } from "@prisma/client";

import { prisma } from "@/backend/database/client";

export class CommunityError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "CommunityError";
  }
}

const REACTION_TYPES = new Set(["like", "star", "fire"]);

const PUBLIC_FEED_LIMIT = 50;

const POST_LIST_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  reactions: { select: { id: true, userId: true, type: true } },
  _count: { select: { comments: true, reactions: true } },
} as const satisfies Prisma.PostInclude;

export async function listPublicPosts(viewerUserId: string) {
  const rows = await prisma.post.findMany({
    where: {
      deletedAt: null,
      OR: [
        { visibility: "PUBLIC" },
        { visibility: "ANONYMOUS" },
        { userId: viewerUserId }, // user always sees their own posts (incl. private)
      ],
    },
    orderBy: { createdAt: "desc" },
    take: PUBLIC_FEED_LIMIT,
    include: POST_LIST_INCLUDE,
  });

  return rows.map((p) => maskAuthor(p, viewerUserId));
}

export async function getPostWithComments(viewerUserId: string, postId: string) {
  const p = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      reactions: { select: { id: true, userId: true, type: true } },
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: { select: { comments: true, reactions: true } },
    },
  });
  if (!p || p.deletedAt) throw new CommunityError(404, "post not found");

  // Visibility check
  if (p.visibility === "PRIVATE" && p.userId !== viewerUserId) {
    throw new CommunityError(403, "forbidden");
  }

  return {
    ...maskAuthor(p, viewerUserId),
    comments: p.comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      author: { id: c.user.id, name: c.user.name, email: c.user.email },
      isOwn: c.userId === viewerUserId,
    })),
  };
}

interface CreatePostArgs {
  userId: string;
  body: string;
  visibility?: PostVisibility;
}

export async function createPost(args: CreatePostArgs) {
  const trimmed = args.body.trim();
  if (!trimmed) throw new CommunityError(400, "post body cannot be empty");
  if (trimmed.length > 4000) throw new CommunityError(400, "post body exceeds 4000 chars");
  return prisma.post.create({
    data: {
      userId: args.userId,
      body: trimmed,
      visibility: args.visibility ?? "PUBLIC",
    },
  });
}

export async function softDeletePost(userId: string, postId: string) {
  const found = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true, deletedAt: true } });
  if (!found || found.deletedAt) throw new CommunityError(404, "post not found");
  if (found.userId !== userId) throw new CommunityError(403, "forbidden");
  await prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
}

export async function addComment(args: { userId: string; postId: string; body: string }) {
  const trimmed = args.body.trim();
  if (!trimmed) throw new CommunityError(400, "comment body cannot be empty");
  if (trimmed.length > 1000) throw new CommunityError(400, "comment body exceeds 1000 chars");

  const post = await prisma.post.findUnique({
    where: { id: args.postId },
    select: { id: true, deletedAt: true, visibility: true, userId: true },
  });
  if (!post || post.deletedAt) throw new CommunityError(404, "post not found");
  if (post.visibility === "PRIVATE" && post.userId !== args.userId) {
    throw new CommunityError(403, "forbidden");
  }

  return prisma.comment.create({
    data: { userId: args.userId, postId: args.postId, body: trimmed },
  });
}

export async function softDeleteComment(userId: string, commentId: string) {
  const c = await prisma.comment.findUnique({ where: { id: commentId }, select: { userId: true, deletedAt: true } });
  if (!c || c.deletedAt) throw new CommunityError(404, "comment not found");
  if (c.userId !== userId) throw new CommunityError(403, "forbidden");
  await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
}

export async function toggleReaction(args: { userId: string; postId: string; type: string }) {
  if (!REACTION_TYPES.has(args.type)) {
    throw new CommunityError(400, `unknown reaction type '${args.type}'`);
  }
  const existing = await prisma.reaction.findUnique({
    where: { postId_userId_type: { postId: args.postId, userId: args.userId, type: args.type } },
  });
  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return { active: false };
  }

  const post = await prisma.post.findUnique({
    where: { id: args.postId },
    select: { id: true, deletedAt: true, visibility: true, userId: true },
  });
  if (!post || post.deletedAt) throw new CommunityError(404, "post not found");
  if (post.visibility === "PRIVATE" && post.userId !== args.userId) {
    throw new CommunityError(403, "forbidden");
  }

  await prisma.reaction.create({
    data: { userId: args.userId, postId: args.postId, type: args.type },
  });
  return { active: true };
}

type RawPost = Prisma.PostGetPayload<{ include: typeof POST_LIST_INCLUDE }>;

function maskAuthor(p: RawPost, viewerUserId: string) {
  const isOwn = p.userId === viewerUserId;
  const author =
    p.visibility === "ANONYMOUS" && !isOwn
      ? { id: null as string | null, name: "Anonymous", email: null as string | null }
      : { id: p.user.id, name: p.user.name, email: p.user.email };

  const counts: Record<string, number> = { like: 0, star: 0, fire: 0 };
  const myReactions = new Set<string>();
  for (const r of p.reactions) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
    if (r.userId === viewerUserId) myReactions.add(r.type);
  }

  return {
    id: p.id,
    body: p.body,
    visibility: p.visibility,
    createdAt: p.createdAt,
    isOwn,
    author,
    commentCount: p._count.comments,
    reactionCounts: counts,
    myReactions: [...myReactions],
  };
}
