import type { Compatibility, CompatibilityKind, Prisma } from "@prisma/client";

import { prisma } from "@/backend/database/client";
import { computeAshtakoot, type AshtakootResult } from "@/backend/services/ashtakoot.service";
import { resolveNatal } from "@/backend/services/chart.service";
import {
  computeComposite,
  computeDavison,
  type CompositeChart,
} from "@/backend/services/composite.service";
import { callLlm } from "@/backend/services/llm/router";
import { resolveVedic } from "@/backend/services/vedic.service";
import type { NatalResponse, PlanetPosition } from "@/shared/types/chart";

export class CompatibilityError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "CompatibilityError";
  }
}

const ASPECT_DEFS = [
  { name: "conjunction", angle: 0, orb: 8, weight: 1.5 },
  { name: "sextile", angle: 60, orb: 6, weight: 2 },
  { name: "square", angle: 90, orb: 7, weight: -2 },
  { name: "trine", angle: 120, orb: 7, weight: 3 },
  { name: "opposition", angle: 180, orb: 8, weight: -2 },
] as const;

type AspectName = (typeof ASPECT_DEFS)[number]["name"];

interface SynastryAspect {
  a: string; // planet name from chart A
  b: string; // planet name from chart B
  aspect: AspectName;
  delta: number; // |actual angle - target| degrees
  weight: number;
}

interface SynastryDetails {
  aspects: SynastryAspect[];
  counts: Record<AspectName, number>;
  weightedScore: number;
  ascA: { sign: string; degree: number };
  ascB: { sign: string; degree: number };
}

const KEY_PLANETS = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"]);

function angleDiff(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

function findAspect(longA: number, longB: number): { aspect: AspectName; delta: number; weight: number } | null {
  const sep = angleDiff(longA, longB);
  let best: { aspect: AspectName; delta: number; weight: number } | null = null;
  for (const def of ASPECT_DEFS) {
    const delta = Math.abs(sep - def.angle);
    if (delta <= def.orb) {
      if (!best || delta < best.delta) best = { aspect: def.name, delta, weight: def.weight };
    }
  }
  return best;
}

function signFor(longitude: number): string {
  const SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
  ];
  return SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)];
}

function computeSynastry(chartA: NatalResponse, chartB: NatalResponse): SynastryDetails {
  const aspects: SynastryAspect[] = [];
  const counts: Record<AspectName, number> = {
    conjunction: 0, sextile: 0, square: 0, trine: 0, opposition: 0,
  };
  let weightedScore = 0;

  const planetsA = chartA.planets.filter((p): p is PlanetPosition => KEY_PLANETS.has(p.name));
  const planetsB = chartB.planets.filter((p): p is PlanetPosition => KEY_PLANETS.has(p.name));

  for (const a of planetsA) {
    for (const b of planetsB) {
      const found = findAspect(a.longitude_deg, b.longitude_deg);
      if (!found) continue;

      // Boost weight when both planets are luminaries/personal — those
      // contacts dominate the felt experience of a relationship.
      let mult = 1;
      const isLumA = a.name === "Sun" || a.name === "Moon";
      const isLumB = b.name === "Sun" || b.name === "Moon";
      if (isLumA && isLumB) mult = 2;
      else if (isLumA || isLumB) mult = 1.4;

      const w = found.weight * mult;
      counts[found.aspect]++;
      weightedScore += w;
      aspects.push({ a: a.name, b: b.name, aspect: found.aspect, delta: Number(found.delta.toFixed(2)), weight: Number(w.toFixed(2)) });
    }
  }

  return {
    aspects,
    counts,
    weightedScore,
    ascA: { sign: signFor(chartA.ascendant_deg), degree: Number((chartA.ascendant_deg % 30).toFixed(2)) },
    ascB: { sign: signFor(chartB.ascendant_deg), degree: Number((chartB.ascendant_deg % 30).toFixed(2)) },
  };
}

function scoreFromWeights(weighted: number): number {
  // Empirically: weightedScore typically ranges roughly -25..+30 across
  // common chart pairs. Map linearly to 0..100, anchored at 50 = neutral.
  const score = 50 + weighted * 1.6;
  return Math.max(5, Math.min(95, Math.round(score)));
}

const KIND_FOCUS: Record<CompatibilityKind, string> = {
  ROMANTIC: "love, intimacy, emotional resonance, conflict patterns, long-term compatibility",
  FRIENDSHIP: "shared values, social rapport, mutual growth, what each brings to the friendship",
  BUSINESS: "complementary strengths, work styles, decision-making chemistry, risks of friction",
  FAMILY: "communication patterns, support styles, generational themes, recurring conflicts",
};

interface ResolveCompatArgs {
  userId: string;
  profileAId: string;
  profileBId: string;
  kind: CompatibilityKind;
}

export async function resolveCompatibility(args: ResolveCompatArgs): Promise<{
  cached: boolean;
  compatibility: Compatibility;
}> {
  if (args.profileAId === args.profileBId) {
    throw new CompatibilityError(400, "the two profiles must be different");
  }

  const profiles = await prisma.profile.findMany({
    where: { id: { in: [args.profileAId, args.profileBId] }, userId: args.userId, deletedAt: null },
    select: {
      id: true, userId: true, fullName: true, birthDate: true, birthPlace: true,
      latitude: true, longitude: true, timezone: true,
    },
  });
  if (profiles.length !== 2) throw new CompatibilityError(404, "one or both profiles not found");

  const [profileA, profileB] = [
    profiles.find((p) => p.id === args.profileAId)!,
    profiles.find((p) => p.id === args.profileBId)!,
  ];

  // Cache check (idempotent on userId+kind+pair)
  const existing = await prisma.compatibility.findUnique({
    where: {
      userId_kind_profileAId_profileBId: {
        userId: args.userId,
        kind: args.kind,
        profileAId: args.profileAId,
        profileBId: args.profileBId,
      },
    },
  });
  if (existing) return { cached: true, compatibility: existing };

  // Resolve both natal charts. For ROMANTIC kind, also pull Vedic data
  // for both profiles so we can compute Ashtakoot Milan.
  const wantVedic = args.kind === "ROMANTIC";
  const [resultA, resultB, vedicA, vedicB] = await Promise.all([
    resolveNatal({
      userId: args.userId, profileId: profileA.id,
      request: {
        birth_datetime_utc: profileA.birthDate.toISOString(),
        latitude: Number(profileA.latitude), longitude: Number(profileA.longitude),
        house_system: "PLACIDUS", system: "BOTH",
      },
    }),
    resolveNatal({
      userId: args.userId, profileId: profileB.id,
      request: {
        birth_datetime_utc: profileB.birthDate.toISOString(),
        latitude: Number(profileB.latitude), longitude: Number(profileB.longitude),
        house_system: "PLACIDUS", system: "BOTH",
      },
    }),
    wantVedic ? resolveVedic({ userId: args.userId, profileId: profileA.id }).catch(() => null) : Promise.resolve(null),
    wantVedic ? resolveVedic({ userId: args.userId, profileId: profileB.id }).catch(() => null) : Promise.resolve(null),
  ]);

  const synastry = computeSynastry(resultA.chart, resultB.chart);
  const westernScore = scoreFromWeights(synastry.weightedScore);

  // For romantic compatibility, blend Western synastry score with the
  // Ashtakoot total (out of 36, normalised to 0-100). 60% Vedic, 40%
  // Western — matches what most Indian-context users expect.
  let ashtakoot: AshtakootResult | null = null;
  let score = westernScore;
  if (wantVedic && vedicA && vedicB) {
    const moonA = vedicA.planets.find((p) => p.name === "Moon");
    const moonB = vedicB.planets.find((p) => p.name === "Moon");
    if (moonA && moonB) {
      ashtakoot = computeAshtakoot(
        { signIdx: moonA.sign_idx, nakshatraIdx: moonA.nakshatra_idx },
        { signIdx: moonB.sign_idx, nakshatraIdx: moonB.nakshatra_idx },
      );
      const ashtaPct = (ashtakoot.total / 36) * 100;
      score = Math.max(5, Math.min(95, Math.round(0.6 * ashtaPct + 0.4 * westernScore)));
    }
  }

  // Composite (TS midpoint) + Davison (real /natal at midpoint date+place).
  // Each can fail independently without breaking the main score.
  let composite: CompositeChart | null = null;
  let davison: NatalResponse | null = null;
  if (args.kind === "ROMANTIC") {
    try {
      composite = computeComposite(resultA.chart, resultB.chart);
    } catch {
      composite = null;
    }
    try {
      davison = await computeDavison({
        userId: args.userId,
        profileA: {
          id: profileA.id,
          birthDate: profileA.birthDate,
          latitude: Number(profileA.latitude),
          longitude: Number(profileA.longitude),
        },
        profileB: {
          id: profileB.id,
          birthDate: profileB.birthDate,
          latitude: Number(profileB.latitude),
          longitude: Number(profileB.longitude),
        },
      });
    } catch {
      davison = null;
    }
  }

  // LLM narrative
  const focus = KIND_FOCUS[args.kind];
  const ashtakootHint = ashtakoot
    ? `\n- Ashtakoot Milan total is ${ashtakoot.total}/36 — verdict: ${ashtakoot.verdict}. Reference one or two specific kootas only when relevant (e.g. "Nadi koota is matched/mismatched"). Don't list every koota.`
    : "";
  const compositeHint = composite || davison
    ? `\n- A composite chart (midpoints between the two natal charts) and/or a Davison chart (a real natal computed for the midpoint date + place) are included. Mention one or two notable placements from the relationship-as-its-own-entity perspective when natural — e.g. "your composite Sun in Libra speaks to a partnership oriented around balance". Don't list every composite planet.`
    : "";
  const systemPrompt = `You are a thoughtful, modern astrologer interpreting a synastry between two natal charts. Rules:

- The aspect data and chart facts in the prompt are ground truth. Do not invent additional aspects, planets, or signs.
- Output GitHub-flavoured Markdown. No level-1 heading. Use ## sub-headings: Overall feel, Strengths, Friction points, Practical guidance.
- Length: roughly 350-600 words.
- Tone: warm, modern English. Specific over generic. Avoid clichés.
- Focus areas for a ${args.kind.toLowerCase()} compatibility: ${focus}.
- Reference 2-3 specific aspects by name (e.g. "your Sun trine her Moon"). Don't list every aspect; use the strongest.
- The score given is a soft summary. Don't over-index on it; the texture is what matters.${ashtakootHint}${compositeHint}`;

  const synastryFacts = {
    kind: args.kind,
    score,
    westernScore,
    profileA: { name: profileA.fullName, birthPlace: profileA.birthPlace, ascendant: synastry.ascA },
    profileB: { name: profileB.fullName, birthPlace: profileB.birthPlace, ascendant: synastry.ascB },
    plantsA: resultA.chart.planets,
    plantsB: resultB.chart.planets,
    aspects: synastry.aspects,
    counts: synastry.counts,
    ashtakoot,
    composite,
    davison: davison ? {
      ascendant_deg: davison.ascendant_deg,
      midheaven_deg: davison.midheaven_deg,
      planets: davison.planets,
    } : null,
  };

  const userPrompt = `Subject: ${args.kind.toLowerCase()} compatibility between ${profileA.fullName} and ${profileB.fullName}.
Compatibility score (0-100): ${score}

Ground-truth synastry data:
${JSON.stringify(synastryFacts, null, 2)}

Write the markdown narrative now.
`;

  const llm = await callLlm({
    route: "compatibility.synastry",
    userId: args.userId,
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    maxOutputTokens: 1800,
  });

  const detailsBlob = {
    ...synastry,
    westernScore,
    ashtakoot,
    composite,
    davison: davison ? {
      ascendant_deg: davison.ascendant_deg,
      midheaven_deg: davison.midheaven_deg,
      planets: davison.planets,
    } : null,
  } as unknown as Prisma.InputJsonValue;

  const compatibility = await prisma.compatibility.create({
    data: {
      userId: args.userId,
      kind: args.kind,
      profileAId: profileA.id,
      profileBId: profileB.id,
      score,
      details: detailsBlob,
      text: llm.text,
      llmProvider: llm.provider,
      llmModel: llm.model,
      inputTokens: llm.inputTokens,
      outputTokens: llm.outputTokens,
      costUsdMicro: llm.costUsdMicro,
    },
  });

  return { cached: false, compatibility };
}

export async function listCompatibilities(userId: string) {
  return prisma.compatibility.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      profileA: { select: { id: true, fullName: true } },
      profileB: { select: { id: true, fullName: true } },
    },
  });
}

export async function getCompatibility(userId: string, id: string) {
  const c = await prisma.compatibility.findUnique({
    where: { id },
    include: {
      profileA: { select: { id: true, fullName: true, birthPlace: true } },
      profileB: { select: { id: true, fullName: true, birthPlace: true } },
    },
  });
  if (!c) throw new CompatibilityError(404, "compatibility not found");
  if (c.userId !== userId) throw new CompatibilityError(403, "forbidden");
  return c;
}

export async function deleteCompatibility(userId: string, id: string) {
  const found = await prisma.compatibility.findUnique({ where: { id }, select: { userId: true } });
  if (!found) throw new CompatibilityError(404, "compatibility not found");
  if (found.userId !== userId) throw new CompatibilityError(403, "forbidden");
  await prisma.compatibility.delete({ where: { id } });
}
