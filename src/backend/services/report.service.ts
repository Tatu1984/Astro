import type { Prisma, Report, ReportKind } from "@prisma/client";

import { prisma } from "@/backend/database/client";
import { resolveNatal } from "@/backend/services/chart.service";
import { callLlm } from "@/backend/services/llm/router";

export class ReportError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ReportError";
  }
}

export const REPORT_KIND_TITLES: Record<ReportKind, string> = {
  NATAL_FULL: "Full natal report",
  CAREER_WEALTH: "Career & wealth",
  LOVE_MARRIAGE: "Love & marriage",
  HEALTH: "Health & well-being",
  EDUCATION: "Education & learning",
  SPIRITUAL: "Spiritual path",
};

export const REPORT_KIND_BLURBS: Record<ReportKind, string> = {
  NATAL_FULL: "A comprehensive read of your full natal chart — personality, strengths, life themes.",
  CAREER_WEALTH: "Career direction, professional strengths, and themes around income and security.",
  LOVE_MARRIAGE: "Patterns in romance, partnership style, and the kind of bond you flourish in.",
  HEALTH: "Energy patterns, well-being habits, and areas to keep balanced.",
  EDUCATION: "Learning style, intellectual strengths, and how you absorb knowledge.",
  SPIRITUAL: "Inner growth, contemplative themes, and the deeper questions your chart asks.",
};

const REPORT_KIND_FOCUS: Record<ReportKind, string> = {
  NATAL_FULL: "personality, core motivations, life themes, strengths and growth edges",
  CAREER_WEALTH: "career direction, professional strengths, money themes, financial security patterns",
  LOVE_MARRIAGE: "romantic patterns, partnership style, what kind of bond suits the chart, communication in relationships",
  HEALTH: "energy patterns, mind-body balance, wellness habits, areas to watch",
  EDUCATION: "learning style, intellectual strengths, study habits, fields aligned with the chart",
  SPIRITUAL: "inner growth, contemplative practice, dharma themes, the deeper questions the chart asks",
};

export async function listReports(userId: string) {
  return prisma.report.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      title: true,
      createdAt: true,
      llmModel: true,
    },
    take: 100,
  });
}

export async function getReport(userId: string, id: string): Promise<Report> {
  const r = await prisma.report.findUnique({ where: { id } });
  if (!r) throw new ReportError(404, "report not found");
  if (r.userId !== userId) throw new ReportError(403, "forbidden");
  return r;
}

export async function deleteReport(userId: string, id: string) {
  const found = await prisma.report.findUnique({ where: { id }, select: { userId: true } });
  if (!found) throw new ReportError(404, "report not found");
  if (found.userId !== userId) throw new ReportError(403, "forbidden");
  await prisma.report.delete({ where: { id } });
}

interface GenerateArgs {
  userId: string;
  profileId: string;
  kind: ReportKind;
}

export async function generateReport(args: GenerateArgs): Promise<Report> {
  const profile = await prisma.profile.findUnique({
    where: { id: args.profileId },
    select: {
      id: true,
      userId: true,
      fullName: true,
      birthDate: true,
      birthPlace: true,
      latitude: true,
      longitude: true,
      timezone: true,
    },
  });
  if (!profile) throw new ReportError(404, "profile not found");
  if (profile.userId !== args.userId) throw new ReportError(403, "forbidden");

  const { chart, row: chartRow } = await resolveNatal({
    userId: args.userId,
    profileId: args.profileId,
    request: {
      birth_datetime_utc: profile.birthDate.toISOString(),
      latitude: Number(profile.latitude),
      longitude: Number(profile.longitude),
      house_system: "PLACIDUS",
      system: "BOTH",
    },
  });

  const focus = REPORT_KIND_FOCUS[args.kind];
  const title = `${profile.fullName} · ${REPORT_KIND_TITLES[args.kind]}`;

  const systemPrompt = `You are a thoughtful, modern astrologer writing a long-form natal report. The reader is a thinking adult; treat them with respect and avoid clichés. Rules:

- The chart JSON below is the only source of truth. Do not invent or contradict planet positions, signs, houses, or aspects.
- Output GitHub-flavoured Markdown. Use level-2 (##) headings to structure the piece. No level-1 heading; the reader has the title in the page chrome.
- Length: roughly 800-1,400 words. Section the body so it scans easily.
- Tone: warm, practical, modern English. Specific over generic. Avoid "the cosmos has aligned"-style cliches.
- Focus areas for this report: ${focus}.
- Include a short intro paragraph; 4-6 themed sections each anchored in two or three named placements from the chart; a "Strengths" section as a bulleted list (3-5 items, 1-line each); a "Growth edges" section similarly bulleted; and a closing paragraph (no heading) that lands the report on a grounded, encouraging note.
- Do not mention transits, dashas, or current sky events — those depend on data this prompt doesn't have. Stick to the natal chart.
- This is a Phase 2 report with no remedial advice (no gems, mantras, etc.) — reserve those for a later module.
`;

  const userPrompt = `Subject: ${REPORT_KIND_TITLES[args.kind]} for ${profile.fullName}, born ${profile.birthDate.toISOString()} (${profile.timezone}) in ${profile.birthPlace}.

Natal chart JSON (ground truth):
${JSON.stringify(
  {
    ascendant_deg: chart.ascendant_deg,
    midheaven_deg: chart.midheaven_deg,
    house_system: chart.house_system,
    houses: chart.houses,
    planets: chart.planets,
  },
  null,
  2,
)}

Write the markdown report now.
`;

  const llm = await callLlm({
    route: `reports.${args.kind.toLowerCase()}`,
    userId: args.userId,
    systemPrompt,
    userPrompt,
    temperature: 0.65,
    maxOutputTokens: 4096,
    modelOverride: "gemini-2.5-pro",
  });

  const report = await prisma.report.create({
    data: {
      userId: args.userId,
      profileId: args.profileId,
      chartId: chartRow.id,
      kind: args.kind,
      title,
      bodyMarkdown: llm.text,
      llmProvider: llm.provider,
      llmModel: llm.model,
      inputTokens: llm.inputTokens,
      outputTokens: llm.outputTokens,
      costUsdMicro: llm.costUsdMicro,
    },
  });

  return report;
}
