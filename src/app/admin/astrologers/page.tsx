import { Mail, MapPin, Phone } from "lucide-react";

import { listAstrologers } from "@/backend/services/astrologer.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { CardLight } from "@/frontend/components/ui/CardLight";

import { StatusControl } from "./status-control";

// Hits Prisma at request time; the proxy already gates access by role.
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-[var(--color-brand-gold)]/15 text-[#a17800] border-[var(--color-brand-gold)]/40",
  ACTIVE: "bg-[var(--color-brand-aqua)]/15 text-[#0a8273] border-[var(--color-brand-aqua)]/40",
  SUSPENDED: "bg-[var(--color-brand-rose)]/15 text-[#9b1c46] border-[var(--color-brand-rose)]/40",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

export default async function Page() {
  const rows = await listAstrologers();

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <TopBar
        title="Admin · astrologers"
        subtitle={`${rows.length} onboarded · ${counts.PENDING ?? 0} pending review`}
        light
        initials="A"
      />
      <div className="p-6 space-y-5 max-w-6xl">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {(["PENDING", "ACTIVE", "SUSPENDED"] as const).map((s) => (
            <div key={s} className={`rounded-md border px-3 py-1.5 ${STATUS_BADGE[s]}`}>
              {s}: <strong>{counts[s] ?? 0}</strong>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <CardLight className="!py-16 text-center">
            <h2 className="text-lg font-semibold">No astrologers onboarded yet</h2>
            <p className="mt-1.5 text-sm text-[var(--color-ink-muted-light)]">
              Use the <strong>+ Astrologer</strong> button on the Users page to onboard one.
            </p>
          </CardLight>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <CardLight key={r.id} className="!p-5">
                <div className="grid lg:grid-cols-[1fr_auto] gap-4 items-start">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-base">{r.fullName}</h3>
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] uppercase tracking-wider ${STATUS_BADGE[r.status]}`}>
                        {r.status}
                      </span>
                      <span className="text-xs text-[var(--color-ink-muted-light)]">
                        joined {fmtDate(r.createdAt)}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-1.5 text-sm text-[var(--color-ink-muted-light)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {r.user.email ?? "—"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {r.phone}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {r.city}, {r.state}
                      </span>
                      <span>
                        KYC: <span className="text-[var(--color-ink-light)]">{r.kycType}</span>
                      </span>
                    </div>
                    {r.specialties.length || r.yearsExperience ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {r.yearsExperience ? (
                          <span className="rounded-md bg-[var(--color-surface-2-light)] px-2 py-0.5 text-[11px]">
                            {r.yearsExperience}y exp
                          </span>
                        ) : null}
                        {r.specialties.map((s) => (
                          <span key={s} className="rounded-md border border-[var(--color-border-light)] px-2 py-0.5 text-[11px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {r.bio ? (
                      <p className="pt-1 text-sm text-[var(--color-ink-muted-light)] max-w-2xl">{r.bio}</p>
                    ) : null}
                  </div>

                  <StatusControl astrologerId={r.id} status={r.status} />
                </div>
              </CardLight>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
