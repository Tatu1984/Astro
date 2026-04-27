import { Prisma, type AstroSystem, type ChartKind, type Chart as ChartRow, type HouseSystem } from "@prisma/client";

import { env } from "@/config/env";
import { findCachedChart, upsertChart } from "@/backend/repositories/chart.repository";
import type { NatalRequest, NatalResponse } from "@/shared/types/chart";

class ComputeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ComputeError";
  }
}

async function callCompute<T>(path: string, body: unknown): Promise<T> {
  if (!env.COMPUTE_BASE_URL) throw new ComputeError(500, "COMPUTE_BASE_URL not configured");
  if (!env.COMPUTE_SHARED_SECRET) throw new ComputeError(500, "COMPUTE_SHARED_SECRET not configured");

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
    throw new ComputeError(res.status, `compute ${path} failed: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

export interface ResolveNatalArgs {
  userId: string;
  profileId: string | null;
  request: NatalRequest;
}

export interface ResolveNatalResult {
  chart: NatalResponse;
  cached: boolean;
  row: ChartRow;
}

const KIND: ChartKind = "NATAL";

/**
 * Compute or fetch a natal chart, persisting result keyed by inputHash so
 * identical requests don't re-hit the compute service.
 */
export async function resolveNatal(args: ResolveNatalArgs): Promise<ResolveNatalResult> {
  const computed = await callCompute<NatalResponse>("/natal", args.request);

  const houseSystem = computed.house_system as HouseSystem;
  const system = computed.system as AstroSystem;

  const cacheKey = {
    userId: args.userId,
    profileId: args.profileId,
    kind: KIND,
    system,
    houseSystem,
    divisionalIx: null,
    inputHash: computed.input_hash,
  };

  const existing = await findCachedChart(cacheKey);
  if (existing) {
    return { chart: existing.payload as unknown as NatalResponse, cached: true, row: existing };
  }

  const row = await upsertChart({
    ...cacheKey,
    payload: JSON.parse(JSON.stringify(computed)) as Prisma.InputJsonValue,
  });
  return { chart: computed, cached: false, row };
}

export { ComputeError };
