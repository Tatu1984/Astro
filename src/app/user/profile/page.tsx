import { redirect } from "next/navigation";
import { Cake, MapPin } from "lucide-react";

import { auth } from "@/auth";
import { listUserProfiles } from "@/backend/services/profile.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";

import { AddProfileDialog } from "./add-profile-dialog";
import { DeleteProfileButton } from "./profile-row-actions";

const KIND_LABEL: Record<string, string> = {
  SELF: "Self",
  PARTNER: "Partner",
  CHILD: "Child",
  FRIEND: "Friend",
  CELEBRITY: "Celebrity",
  OTHER: "Other",
};

function formatDate(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: tz,
  }).format(d);
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profiles = await listUserProfiles(session.user.id);

  return (
    <>
      <TopBar
        title="Profiles"
        subtitle={`${profiles.length} profile${profiles.length === 1 ? "" : "s"} · charts compute from these`}
        right={<AddProfileDialog />}
      />
      <div className="p-6 space-y-5 max-w-3xl">
        {profiles.length === 0 ? (
          <Card className="!p-10 text-center">
            <h2 className="text-xl font-semibold text-white">No profiles yet</h2>
            <p className="mt-2 text-sm text-white/60 max-w-md mx-auto">
              Add your birth date, time and place to compute your natal chart. The map will help you pick the exact location.
            </p>
            <div className="mt-6 flex justify-center">
              <AddProfileDialog buttonLabel="Add your first profile" />
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <Card key={p.id} className="!p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{p.fullName}</h3>
                      <span className="rounded-md border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
                        {KIND_LABEL[p.kind] ?? p.kind}
                      </span>
                    </div>
                    <div className="mt-2 grid sm:grid-cols-2 gap-1 text-sm text-white/70">
                      <span className="inline-flex items-center gap-1.5">
                        <Cake className="h-3.5 w-3.5 text-[var(--color-brand-gold)]" />
                        {formatDate(p.birthDate, p.timezone)}
                        {p.unknownTime ? <span className="text-white/40">(time unknown)</span> : null}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[var(--color-brand-aqua)]" />
                        {p.birthPlace}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/40">
                      {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)} · {p.timezone}
                    </p>
                  </div>
                  <DeleteProfileButton profileId={p.id} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
