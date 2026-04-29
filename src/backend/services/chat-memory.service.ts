import { prisma } from "@/backend/database/client";
import { callLlm } from "@/backend/services/llm/router";

/**
 * Sentinel prefix marking a SYSTEM-role message that holds a generated
 * summary of an older session. Stored on the same AiChatSession as a
 * "memory carrier" message — first thing read on session start, filtered
 * out of the visible UI by the chat service.
 */
export const MEMORY_SUMMARY_PREFIX = "[MEMORY-SUMMARY] ";

/**
 * Sentinel marking a SYSTEM message that carries summaries of OTHER
 * older sessions, injected at session start. Filtered out of the UI.
 */
export const SESSION_MEMORY_PREFIX = "[SESSION-MEMORY] ";

const SUMMARY_IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 min idle = "ended"

/**
 * Fetch up to `limit` recent past-session summaries for this profile —
 * skipping the active session if `excludeSessionId` is supplied. Returns
 * the summary text in newest-first order (caller usually prepends them
 * as a "Past conversation themes:" block in the system prompt).
 */
export async function getRecentSessionSummaries(
  userId: string,
  profileId: string,
  limit = 5,
  excludeSessionId?: string,
): Promise<string[]> {
  const sessions = await prisma.aiChatSession.findMany({
    where: {
      userId,
      profileId,
      ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 25,
    select: {
      id: true,
      messages: {
        where: { role: "SYSTEM", content: { startsWith: MEMORY_SUMMARY_PREFIX } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  const out: string[] = [];
  for (const s of sessions) {
    const summary = s.messages[0]?.content;
    if (summary) out.push(summary.slice(MEMORY_SUMMARY_PREFIX.length).trim());
    if (out.length >= limit) break;
  }
  return out;
}

interface SummarizeArgs {
  sessionId: string;
  userId: string;
}

/**
 * Read a session's USER + ASSISTANT messages, ask the LLM for a 3-sentence
 * summary, and persist it as a SYSTEM-role memory message. Idempotent for
 * a given message-tail: if the latest stored summary is newer than the
 * latest non-system message, returns the existing summary.
 */
export async function summarizeSession({ sessionId, userId }: SummarizeArgs): Promise<string | null> {
  const session = await prisma.aiChatSession.findUnique({
    where: { id: sessionId },
    select: {
      userId: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, createdAt: true },
      },
    },
  });
  if (!session || session.userId !== userId) return null;

  const conversational = session.messages.filter((m) => m.role !== "SYSTEM");
  if (conversational.length < 2) return null;

  const lastConv = conversational[conversational.length - 1];
  const existingSummary = [...session.messages]
    .reverse()
    .find((m) => m.role === "SYSTEM" && m.content.startsWith(MEMORY_SUMMARY_PREFIX));
  if (existingSummary && existingSummary.createdAt > lastConv.createdAt) {
    return existingSummary.content.slice(MEMORY_SUMMARY_PREFIX.length).trim();
  }

  const transcript = conversational
    .map((m) => `${m.role === "USER" ? "USER" : "ASTROLOGER"}: ${m.content}`)
    .join("\n");

  const llm = await callLlm({
    route: "ai.chat.summary",
    userId,
    systemPrompt:
      "Summarise the user's themes and what was discussed in exactly three sentences. Refer to the user as 'the user'. Do not include the astrologer's specific advice; focus on what the user wanted to understand and the recurring topics. Plain prose, no bullets, no markdown.",
    userPrompt: transcript,
    temperature: 0.3,
    maxOutputTokens: 256,
  });

  const summary = llm.text.trim();
  if (!summary) return null;

  await prisma.aiChatMessage.create({
    data: {
      sessionId,
      role: "SYSTEM",
      content: `${MEMORY_SUMMARY_PREFIX}${summary}`,
      llmProvider: llm.provider,
      llmModel: llm.model,
      inputTokens: llm.inputTokens,
      outputTokens: llm.outputTokens,
      costUsdMicro: llm.costUsdMicro,
    },
  });

  return summary;
}

/**
 * Best-effort summary of any sessions that look "ended" (no message in
 * the last SUMMARY_IDLE_THRESHOLD_MS) and don't already have an up-to-
 * date summary. Fire-and-forget; safe to call from the request that
 * starts the *next* chat session.
 */
export async function summarizeIdleSessions(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - SUMMARY_IDLE_THRESHOLD_MS);
  const sessions = await prisma.aiChatSession.findMany({
    where: { userId, updatedAt: { lt: cutoff } },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: { id: true },
  });
  for (const s of sessions) {
    try {
      await summarizeSession({ sessionId: s.id, userId });
    } catch (err) {
      console.warn("[chat-memory] summarizeIdleSessions failed", { sessionId: s.id, err });
    }
  }
}

/**
 * Build the past-conversation themes block to inject into a chat system
 * prompt at session start. Returns "" when there's nothing useful to add.
 */
export function buildMemoryBlock(summaries: string[]): string {
  if (summaries.length === 0) return "";
  const numbered = summaries.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return [
    "Past conversation themes (older chats with this user):",
    numbered,
    "Use these as light context only — do not contradict or repeat them verbatim. The user has not necessarily mentioned them in the current chat.",
  ].join("\n");
}
