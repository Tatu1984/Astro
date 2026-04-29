import { redirect } from "next/navigation";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { listTemplates } from "@/backend/services/consult-template.service";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";
import { TopBar } from "@/frontend/components/portal/TopBar";

import { TemplatesEditor } from "./templates-editor";

export default async function TemplatesPage() {
  const me = await getAuthedUser();
  if (!me) redirect("/login");
  if (me.role !== "ASTROLOGER" && me.role !== "ADMIN") redirect("/login");
  const profile = await requireOwnAstrologerProfile(me.userId);
  const data = await listTemplates(profile.id);

  return (
    <>
      <TopBar
        title="Templates"
        subtitle="Reusable note snippets you can insert during a session"
      />
      <div className="p-6">
        <TemplatesEditor initial={data} />
      </div>
    </>
  );
}
