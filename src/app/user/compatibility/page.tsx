import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, HeartHandshake, Briefcase, Users } from "lucide-react";
import type { CompatibilityKind } from "@prisma/client";

import { auth } from "@/auth";
import { listUserProfiles } from "@/backend/services/profile.service";
import { listCompatibilities } from "@/backend/services/synastry.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";

import { GenerateCompatibilityForm } from "./generate-form";

export const dynamic = "force-dynamic";

const KIND_ICON: Record<CompatibilityKind, React.ReactNode> = {
  ROMANTIC: <Heart className="h-4 w-4" />,
  FRIENDSHIP: <HeartHandshake className="h-4 w-4" />,
  BUSINESS: <Briefcase className="h-4 w-4" />,
  FAMILY: <Users className="h-4 w-4" />,
};

const KIND_LABEL: Record<CompatibilityKind, string> = {
  ROMANTIC: "Romantic",
  FRIENDSHIP: "Friendship",
  BUSINESS: "Business",
  FAMILY: "Family",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function scoreTone(score: number): string {
  if (score >= 75) return "text-[var(--color-brand-aqua)]";
  if (score >= 55) return "text-[var(--color-brand-gold)]";
  if (score >= 35) return "text-white/70";
  return "text-[var(--color-brand-rose)]";
}

export default async function CompatibilityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profiles, compatibilities] = await Promise.all([
    listUserProfiles(session.user.id),
    listCompatibilities(session.user.id),
  ]);

  return (
    <>
      <TopBar
        title="Compatibility"
        subtitle="Synastry between two natal charts · cached per pair"
      />
      <div className="p-6 space-y-6 max-w-4xl">
        <section>
          <h2 className="text-xs uppercase tracking-wider text-white/45 mb-3">Generate a new report</h2>
          <GenerateCompatibilityForm
            profiles={profiles.map((p) => ({ id: p.id, fullName: p.fullName }))}
          />
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-wider text-white/45 mb-3">Your compatibilities</h2>
          {compatibilities.length === 0 ? (
            <Card className="!p-8 text-center">
              <p className="text-sm text-white/55">No compatibility reports yet.</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {compatibilities.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/user/compatibility/${c.id}`}
                    className="flex items-center gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-white/5 px-4 py-3"
                  >
                    <span className="text-[var(--color-brand-gold)]">{KIND_ICON[c.kind]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">
                        {c.profileA.fullName} <span className="text-white/40">·</span> {c.profileB.fullName}
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">
                        {KIND_LABEL[c.kind]} · {fmtDate(c.createdAt)}
                      </div>
                    </div>
                    <div className={`text-2xl font-semibold tabular-nums ${scoreTone(c.score)}`}>{c.score}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
