import { env } from "@/config/env";
import type { NatalRequest, NatalResponse } from "@/shared/types/chart";

class ComputeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ComputeError";
  }
}

async function callCompute<T>(path: string, body: unknown): Promise<T> {
  if (!env.COMPUTE_BASE_URL) {
    throw new ComputeError(500, "COMPUTE_BASE_URL not configured");
  }
  if (!env.COMPUTE_SHARED_SECRET) {
    throw new ComputeError(500, "COMPUTE_SHARED_SECRET not configured");
  }

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

export async function computeNatal(req: NatalRequest): Promise<NatalResponse> {
  return callCompute<NatalResponse>("/natal", req);
}

export { ComputeError };
