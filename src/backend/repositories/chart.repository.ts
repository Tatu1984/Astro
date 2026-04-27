import type { AstroSystem, ChartKind, HouseSystem, Prisma } from "@prisma/client";

import { prisma } from "@/backend/database/client";

export interface UpsertChartInput {
  userId: string;
  profileId: string | null;
  kind: ChartKind;
  system: AstroSystem;
  houseSystem: HouseSystem;
  divisionalIx: number | null;
  inputHash: string;
  payload: Prisma.InputJsonValue;
}

export async function findCachedChart(args: Omit<UpsertChartInput, "payload">) {
  return prisma.chart.findFirst({
    where: {
      userId: args.userId,
      profileId: args.profileId,
      kind: args.kind,
      system: args.system,
      houseSystem: args.houseSystem,
      divisionalIx: args.divisionalIx,
      inputHash: args.inputHash,
    },
  });
}

export async function upsertChart(input: UpsertChartInput) {
  // Idempotent on (userId, kind, system, houseSystem, inputHash). profileId
  // is intentionally not part of the key — same chart math gets the same
  // cached row regardless of which profile triggered it.
  return prisma.chart.upsert({
    where: {
      userId_kind_system_houseSystem_inputHash: {
        userId: input.userId,
        kind: input.kind,
        system: input.system,
        houseSystem: input.houseSystem,
        inputHash: input.inputHash,
      },
    },
    create: { ...input },
    update: { payload: input.payload },
  });
}
