import { TopBar } from "@/frontend/components/portal/TopBar";
import { ModerationClient } from "./moderation-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <TopBar
        title="Admin · moderation"
        subtitle="Review posts, comments and user bans"
        light
        initials="A"
      />
      <div className="p-6 space-y-5 max-w-6xl">
        <ModerationClient />
      </div>
    </>
  );
}
