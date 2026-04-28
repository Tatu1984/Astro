import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getSessionWithMessages, listChatSessions } from "@/backend/services/chat.service";
import { TopBar } from "@/frontend/components/portal/TopBar";

import { ChatView, type SessionListItem } from "./chat-view";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const allSessions = await listChatSessions(session.user.id);
  const sessionList: SessionListItem[] = allSessions.map((s) => ({
    id: s.id,
    title: s.title,
    updatedAt: s.updatedAt.toISOString(),
    messageCount: s._count.messages,
  }));

  let active = null;
  const targetId = params.session ?? sessionList[0]?.id;
  if (targetId) {
    try {
      const fetched = await getSessionWithMessages(session.user.id, targetId);
      active = {
        id: fetched.id,
        title: fetched.title,
        updatedAt: fetched.updatedAt.toISOString(),
        profile: fetched.profile,
        messages: fetched.messages.map((m) => ({
          id: m.id,
          role: m.role as "USER" | "ASSISTANT" | "SYSTEM",
          content: m.content,
          llmProvider: m.llmProvider,
          llmModel: m.llmModel,
          createdAt: m.createdAt.toISOString(),
        })),
      };
    } catch {
      // session id from query string was wrong/forbidden; ignore and let
      // the user start fresh
    }
  }

  return (
    <>
      <TopBar
        title="AI Chat"
        subtitle="Ask anything · grounded in your natal chart"
      />
      <ChatView initialSessions={sessionList} initialActive={active} />
    </>
  );
}
