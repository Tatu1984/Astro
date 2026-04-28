import type { AiChatMessage, AiChatSession } from "@prisma/client";

import { prisma } from "@/backend/database/client";
import { resolveNatal } from "@/backend/services/chart.service";
import { callLlm } from "@/backend/services/llm/router";

export class ChatError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ChatError";
  }
}

const MAX_HISTORY_TURNS = 20;
const MAX_USER_MESSAGE_CHARS = 4000;

const SYSTEM_PROMPT = `You are a thoughtful, modern astrologer helping the user understand their natal chart in plain language.

Rules:
- Treat the chart JSON in the conversation as ground truth. Never contradict, invent, or fabricate planet positions, signs, houses, or aspects beyond what is stated in the JSON.
- Tone: warm, practical, modern English. Short paragraphs. Avoid clichés like "the cosmos has aligned"; speak as a wise friend.
- Stay focused on natal-chart interpretation. If the user asks about transits, dashas, or current sky events, note that those land in Phase 3 and give what general guidance the natal chart supports.
- If the user asks for medical, legal, or financial advice, briefly recommend they consult a qualified professional in addition to the astrological perspective.
- Keep replies concise. Most questions only need 2–4 short paragraphs.`;

export async function listChatSessions(userId: string) {
  return prisma.aiChatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
    take: 50,
  });
}

export async function getSessionWithMessages(userId: string, sessionId: string) {
  const session = await prisma.aiChatSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      profile: { select: { id: true, fullName: true } },
    },
  });
  if (!session) throw new ChatError(404, "session not found");
  if (session.userId !== userId) throw new ChatError(403, "forbidden");
  return session;
}

export async function startSession(userId: string): Promise<AiChatSession> {
  const profile = await prisma.profile.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!profile) {
    throw new ChatError(400, "add a birth profile before starting a chat");
  }
  return prisma.aiChatSession.create({
    data: {
      userId,
      profileId: profile.id,
      title: null, // first message will set this
    },
  });
}

export async function deleteSession(userId: string, sessionId: string) {
  const found = await prisma.aiChatSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });
  if (!found) throw new ChatError(404, "session not found");
  if (found.userId !== userId) throw new ChatError(403, "forbidden");
  await prisma.aiChatSession.delete({ where: { id: sessionId } });
}

interface SendMessageArgs {
  userId: string;
  sessionId: string;
  content: string;
}

interface SendMessageResult {
  userMessage: AiChatMessage;
  assistantMessage: AiChatMessage;
}

export async function sendMessage(args: SendMessageArgs): Promise<SendMessageResult> {
  const trimmed = args.content.trim();
  if (!trimmed) throw new ChatError(400, "message cannot be empty");
  if (trimmed.length > MAX_USER_MESSAGE_CHARS) {
    throw new ChatError(400, `message exceeds ${MAX_USER_MESSAGE_CHARS} chars`);
  }

  const session = await prisma.aiChatSession.findUnique({
    where: { id: args.sessionId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true },
      },
      profile: true,
    },
  });
  if (!session) throw new ChatError(404, "session not found");
  if (session.userId !== args.userId) throw new ChatError(403, "forbidden");
  if (!session.profile) throw new ChatError(400, "session has no profile bound");

  const profile = session.profile;

  // Pull or compute the natal chart for ground-truth context.
  const { chart } = await resolveNatal({
    userId: args.userId,
    profileId: profile.id,
    request: {
      birth_datetime_utc: profile.birthDate.toISOString(),
      latitude: Number(profile.latitude),
      longitude: Number(profile.longitude),
      house_system: "PLACIDUS",
      system: "BOTH",
    },
  });

  const chartContext = `Birth profile and natal chart for ${profile.fullName}, born ${profile.birthDate.toISOString()} (${profile.timezone}) in ${profile.birthPlace}.

Natal chart JSON (ground truth — do not contradict):
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
)}`;

  // Build the prompt: chart context as the first user "turn", then the
  // last MAX_HISTORY_TURNS messages, then the new user message.
  const recentTurns = session.messages.slice(-MAX_HISTORY_TURNS);
  const conversationLines: string[] = [
    `[chart context]`,
    chartContext,
    "",
    "[conversation so far]",
    ...recentTurns.map((m) => `${m.role === "ASSISTANT" ? "ASTROLOGER" : "USER"}: ${m.content}`),
    "",
    `USER: ${trimmed}`,
    `ASTROLOGER:`,
  ];

  const llm = await callLlm({
    route: "ai.chat",
    userId: args.userId,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: conversationLines.join("\n"),
    temperature: 0.6,
    maxOutputTokens: 1024,
  });

  // Persist both messages and bump the session timestamp.
  const result = await prisma.$transaction(async (tx) => {
    const userMessage = await tx.aiChatMessage.create({
      data: {
        sessionId: args.sessionId,
        role: "USER",
        content: trimmed,
      },
    });
    const assistantMessage = await tx.aiChatMessage.create({
      data: {
        sessionId: args.sessionId,
        role: "ASSISTANT",
        content: llm.text,
        llmProvider: llm.provider,
        llmModel: llm.model,
        inputTokens: llm.inputTokens,
        outputTokens: llm.outputTokens,
        costUsdMicro: llm.costUsdMicro,
      },
    });
    // Set title from the first user message if not yet set.
    if (!session.title) {
      const fallbackTitle = trimmed.slice(0, 60) + (trimmed.length > 60 ? "…" : "");
      await tx.aiChatSession.update({
        where: { id: args.sessionId },
        data: { title: fallbackTitle, updatedAt: new Date() },
      });
    } else {
      await tx.aiChatSession.update({
        where: { id: args.sessionId },
        data: { updatedAt: new Date() },
      });
    }
    return { userMessage, assistantMessage };
  });

  return result;
}
