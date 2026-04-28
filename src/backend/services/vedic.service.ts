import { env } from "@/config/env";
import { prisma } from "@/backend/database/client";
import type { VedicRequest, VedicResponse } from "@/shared/types/chart";

export class VedicError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "VedicError";
  }
}

async function callCompute<T>(path: string, body: unknown): Promise<T> {
  if (!env.COMPUTE_BASE_URL) throw new VedicError(500, "COMPUTE_BASE_URL not configured");
  if (!env.COMPUTE_SHARED_SECRET) throw new VedicError(500, "COMPUTE_SHARED_SECRET not configured");

  const url = `${env.COMPUTE_BASE_URL.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Compute-Secret": env.COMPUTE_SHARED_SECRET,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new VedicError(res.status, `compute ${path} failed: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export interface ResolveVedicArgs {
  userId: string;
  profileId: string;
}

/**
 * Compute the Vedic chart for a user's profile. Currently uncached
 * because the dasha info changes with "now" — caching by birth-data hash
 * + day would be a nice optimisation but isn't worth the complexity yet.
 */
export async function resolveVedic(args: ResolveVedicArgs): Promise<VedicResponse> {
  const profile = await prisma.profile.findUnique({
    where: { id: args.profileId },
    select: {
      id: true, userId: true, birthDate: true, latitude: true, longitude: true,
    },
  });
  if (!profile) throw new VedicError(404, "profile not found");
  if (profile.userId !== args.userId) throw new VedicError(403, "forbidden");

  const req: VedicRequest = {
    birth_datetime_utc: profile.birthDate.toISOString(),
    latitude: Number(profile.latitude),
    longitude: Number(profile.longitude),
  };
  return callCompute<VedicResponse>("/vedic", req);
}
