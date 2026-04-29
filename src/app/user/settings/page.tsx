import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getSettings } from "@/backend/services/settings.service";
import { TopBar } from "@/frontend/components/portal/TopBar";

import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const settings = await getSettings(session.user.id);

  return (
    <>
      <TopBar title="Settings" subtitle="Account, reading style, theme, notifications" />
      <div className="p-6">
        <SettingsForm initial={settings} />
      </div>
    </>
  );
}
