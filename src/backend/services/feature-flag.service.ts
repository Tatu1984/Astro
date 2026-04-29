import { createHash } from "node:crypto";

import { prisma } from "@/backend/database/client";

export class FeatureFlagError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "FeatureFlagError";
  }
}

interface CachedFlag {
  enabled: boolean;
  rolloutPct: number;
  cachedAt: number;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CachedFlag>();

async function loadFlag(key: string): Promise<CachedFlag | null> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.cachedAt < CACHE_TTL_MS) return hit;
  const row = await prisma.featureFlag.findUnique({
    where: { key },
    select: { enabled: true, rolloutPct: true },
  });
  if (!row) {
    cache.delete(key);
    return null;
  }
  const entry: CachedFlag = { enabled: row.enabled, rolloutPct: row.rolloutPct, cachedAt: now };
  cache.set(key, entry);
  return entry;
}

function bucketFor(key: string, userId: string): number {
  const h = createHash("sha256").update(`${key}:${userId}`).digest();
  // first 4 bytes -> uint32 -> mod 100
  const n = h.readUInt32BE(0);
  return n % 100;
}

export async function isEnabled(key: string, opts?: { userId?: string }): Promise<boolean> {
  const flag = await loadFlag(key);
  if (!flag) return false;
  if (flag.enabled) return true;
  if (flag.rolloutPct <= 0) return false;
  if (flag.rolloutPct >= 100) return true;
  const uid = opts?.userId;
  if (!uid) return false;
  return bucketFor(key, uid) < flag.rolloutPct;
}

export async function getAllFlags() {
  return prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
}

export async function getFlag(id: string) {
  return prisma.featureFlag.findUnique({ where: { id } });
}

export interface CreateFlagInput {
  key: string;
  description?: string | null;
  enabled?: boolean;
  rolloutPct?: number;
}

export async function createFlag(input: CreateFlagInput) {
  const existing = await prisma.featureFlag.findUnique({ where: { key: input.key } });
  if (existing) throw new FeatureFlagError(409, `flag '${input.key}' already exists`);
  const flag = await prisma.featureFlag.create({
    data: {
      key: input.key,
      description: input.description ?? null,
      enabled: input.enabled ?? false,
      rolloutPct: clampPct(input.rolloutPct ?? 0),
    },
  });
  cache.delete(input.key);
  return flag;
}

export interface UpdateFlagInput {
  description?: string | null;
  enabled?: boolean;
  rolloutPct?: number;
}

export async function updateFlag(id: string, input: UpdateFlagInput) {
  const existing = await prisma.featureFlag.findUnique({ where: { id } });
  if (!existing) throw new FeatureFlagError(404, "flag not found");
  const flag = await prisma.featureFlag.update({
    where: { id },
    data: {
      description: input.description ?? existing.description,
      enabled: input.enabled ?? existing.enabled,
      rolloutPct: input.rolloutPct != null ? clampPct(input.rolloutPct) : existing.rolloutPct,
    },
  });
  cache.delete(flag.key);
  return flag;
}

export async function deleteFlag(id: string) {
  const existing = await prisma.featureFlag.findUnique({ where: { id } });
  if (!existing) throw new FeatureFlagError(404, "flag not found");
  await prisma.featureFlag.delete({ where: { id } });
  cache.delete(existing.key);
  return existing;
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}
