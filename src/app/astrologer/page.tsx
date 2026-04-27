import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Inbox,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";

import { auth } from "@/auth";
import { getOwnAstrologerProfile } from "@/backend/services/astrologer.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";

const STATUS_BADGE_TONE: Record<string, "aqua" | "gold" | "rose"> = {
  ACTIVE: "aqua",
  PENDING: "gold",
  SUSPENDED: "rose",
};

function StatusBanner({ status }: { status: "PENDING" | "ACTIVE" | "SUSPENDED" }) {
  if (status === "ACTIVE") {
    return (
      <div className="flex items-center gap-3 rounded-md border border-[var(--color-brand-aqua)]/30 bg-[var(--color-brand-aqua)]/10 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-[var(--color-brand-aqua)]" />
        <p className="text-sm text-white">
          Your account is <strong>active</strong>. Once consultations and bookings ship, clients will be able to find you.
        </p>
      </div>
    );
  }
  if (status === "PENDING") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-[var(--color-brand-gold)]/30 bg-[var(--color-brand-gold)]/10 px-4 py-3">
        <Clock className="h-4 w-4 text-[var(--color-brand-gold)] mt-0.5" />
        <div className="text-sm text-white">
          <p>
            Your account is <strong>awaiting admin review</strong>. KYC and banking details will be verified before activation.
          </p>
          <p className="mt-1 text-white/55 text-xs">
            You can review what we have on file under <Link href="/astrologer/profile" className="underline">Profile</Link>.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-md border border-[var(--color-brand-rose)]/30 bg-[var(--color-brand-rose)]/10 px-4 py-3">
      <AlertTriangle className="h-4 w-4 text-[var(--color-brand-rose)] mt-0.5" />
      <div className="text-sm text-white">
        <p>
          Your account is <strong>suspended</strong>. Contact support for next steps.
        </p>
      </div>
    </div>
  );
}

export default async function AstrologerDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await getOwnAstrologerProfile(session.user.id);

  // Edge case: ADMIN poking around an astrologer route, or ASTROLOGER role
  // that somehow has no AstrologerProfile row. The proxy already gates by
  // role, so this is just a safety net.
  if (!profile) {
    return (
      <>
        <TopBar
          title="Astrologer"
          subtitle="No astrologer profile on file"
          right={<Badge tone="rose">No profile</Badge>}
          initials="?"
        />
        <div className="p-6 max-w-2xl">
          <Card className="!p-8 text-center">
            <h2 className="text-lg font-semibold text-white">Profile missing</h2>
            <p className="mt-2 text-sm text-white/60 max-w-md mx-auto">
              Your account has the ASTROLOGER role but no astrologer profile is attached. Ask an admin to onboard you via the Users page.
            </p>
          </Card>
        </div>
      </>
    );
  }

  const initials = profile.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <TopBar
        title={`Welcome, ${profile.fullName}`}
        subtitle={`${profile.city}, ${profile.state} · joined ${profile.createdAt.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" })}`}
        right={<Badge tone={STATUS_BADGE_TONE[profile.status]}>● {profile.status}</Badge>}
        initials={initials}
      />
      <div className="p-6 space-y-6">
        <StatusBanner status={profile.status} />

        {/* Profile snapshot */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <Card className="!p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--color-brand-gold)]">Profile snapshot</h3>
              <Link href="/astrologer/profile">
                <Button variant="outline" size="sm">View full profile</Button>
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <SnapField icon={<User className="h-3.5 w-3.5" />} label="Name" value={profile.fullName} />
              <SnapField icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={profile.phone} />
              <SnapField icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={`${profile.city}, ${profile.state}, ${profile.country}`} />
              <SnapField
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label="KYC"
                value={`${profile.kycType}${profile.kycVerifiedAt ? " · verified" : ""}`}
              />
              {typeof profile.yearsExperience === "number" ? (
                <SnapField
                  icon={<Award className="h-3.5 w-3.5" />}
                  label="Experience"
                  value={`${profile.yearsExperience} year${profile.yearsExperience === 1 ? "" : "s"}`}
                />
              ) : null}
            </div>

            {profile.specialties.length ? (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wider text-white/40 mb-1.5">Specialties</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.specialties.map((s) => (
                    <span
                      key={s}
                      className="rounded-md border border-[var(--color-border)] bg-white/5 px-2 py-0.5 text-[11px] text-white/80"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {profile.bio ? (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wider text-white/40 mb-1.5">Bio</p>
                <p className="text-sm text-white/70 leading-relaxed">{profile.bio}</p>
              </div>
            ) : null}
          </Card>

          {/* Coming-soon panels */}
          <Card accent="violet" className="!p-6">
            <h3 className="font-semibold text-[var(--color-brand-gold)] mb-3">What's next</h3>
            <ul className="space-y-3 text-sm">
              <ComingSoonItem icon={<Inbox className="h-3.5 w-3.5" />} label="Live queue" body="Booking + queueing arrives in Phase 3." />
              <ComingSoonItem icon={<User className="h-3.5 w-3.5" />} label="Clients" body="View clients you've consulted with — Phase 3." />
              <ComingSoonItem icon={<Award className="h-3.5 w-3.5" />} label="Earnings & payouts" body="Stripe + RevenueCat integration in Phase 5." />
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function SnapField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-white/40 mb-1 inline-flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="text-white/85">{value}</p>
    </div>
  );
}

function ComingSoonItem({
  icon,
  label,
  body,
}: {
  icon: React.ReactNode;
  label: string;
  body: string;
}) {
  return (
    <li>
      <div className="flex items-center gap-2 text-white/85">
        {icon}
        <span className="font-medium">{label}</span>
        <span className="ml-auto rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
          Soon
        </span>
      </div>
      <p className="text-xs text-white/50 mt-0.5">{body}</p>
    </li>
  );
}
