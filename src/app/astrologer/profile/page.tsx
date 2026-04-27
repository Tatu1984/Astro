import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Award,
  Banknote,
  CheckCircle2,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";

import { auth } from "@/auth";
import { getOwnAstrologerProfile } from "@/backend/services/astrologer.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Badge } from "@/frontend/components/ui/Badge";
import { Card } from "@/frontend/components/ui/Card";

const STATUS_BADGE_TONE: Record<string, "aqua" | "gold" | "rose"> = {
  ACTIVE: "aqua",
  PENDING: "gold",
  SUSPENDED: "rose",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  ACTIVE: <CheckCircle2 className="h-3.5 w-3.5" />,
  PENDING: <Clock className="h-3.5 w-3.5" />,
  SUSPENDED: <AlertTriangle className="h-3.5 w-3.5" />,
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

export default async function AstrologerProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await getOwnAstrologerProfile(session.user.id);
  if (!profile) {
    return (
      <>
        <TopBar title="Profile" subtitle="No astrologer profile on file" right={<Badge tone="rose">No profile</Badge>} initials="?" />
        <div className="p-6 max-w-2xl">
          <Card className="!p-8 text-center">
            <h2 className="text-lg font-semibold text-white">Profile missing</h2>
            <p className="mt-2 text-sm text-white/60 max-w-md mx-auto">
              Ask an admin to onboard you via the Users page.
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
        title="My profile"
        subtitle={`Onboarded ${fmtDate(profile.createdAt)} · status ${profile.status}`}
        right={
          <Badge tone={STATUS_BADGE_TONE[profile.status]}>
            <span className="inline-flex items-center gap-1">
              {STATUS_ICON[profile.status]}
              {profile.status}
            </span>
          </Badge>
        }
        initials={initials}
      />

      <div className="p-6 space-y-5 max-w-4xl">
        <p className="text-xs text-white/45">
          Read-only. Contact admin to update KYC or banking details. Non-sensitive edits (bio, qualifications) coming next.
        </p>

        <Section title="Account">
          <Field icon={<User className="h-3.5 w-3.5" />} label="Full name" value={profile.fullName} />
          <Field icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={profile.user.email ?? "—"} />
          <Field icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={profile.phone} />
          {profile.alternatePhone ? (
            <Field icon={<Phone className="h-3.5 w-3.5" />} label="Alternate phone" value={profile.alternatePhone} />
          ) : null}
        </Section>

        <Section title="Address">
          <FieldFull icon={<MapPin className="h-3.5 w-3.5" />} label="Address">
            <div>{profile.addressLine1}</div>
            {profile.addressLine2 ? <div>{profile.addressLine2}</div> : null}
            <div>
              {profile.city}, {profile.state} {profile.postalCode}
            </div>
            <div className="inline-flex items-center gap-1 text-white/55">
              <Globe className="h-3 w-3" />
              {profile.country}
            </div>
          </FieldFull>
        </Section>

        <Section title="KYC">
          <Field icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Document type" value={profile.kycType} />
          <Field
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            label="Document number"
            value={profile.kycNumber}
          />
          <Field
            icon={profile.kycVerifiedAt ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            label="Verification"
            value={profile.kycVerifiedAt ? `verified ${fmtDate(profile.kycVerifiedAt)}` : "pending admin review"}
          />
        </Section>

        <Section title="Professional">
          {typeof profile.yearsExperience === "number" ? (
            <Field icon={<Award className="h-3.5 w-3.5" />} label="Years of experience" value={String(profile.yearsExperience)} />
          ) : null}
          {profile.specialties.length ? (
            <FieldFull icon={<Award className="h-3.5 w-3.5" />} label="Specialties">
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {profile.specialties.map((s) => (
                  <span key={s} className="rounded-md border border-[var(--color-border)] bg-white/5 px-2 py-0.5 text-[11px]">
                    {s}
                  </span>
                ))}
              </div>
            </FieldFull>
          ) : null}
          {profile.qualifications ? (
            <FieldFull icon={<Award className="h-3.5 w-3.5" />} label="Qualifications">
              <p className="whitespace-pre-wrap leading-relaxed text-white/85">{profile.qualifications}</p>
            </FieldFull>
          ) : null}
          {profile.bio ? (
            <FieldFull icon={<User className="h-3.5 w-3.5" />} label="Bio">
              <p className="whitespace-pre-wrap leading-relaxed text-white/85">{profile.bio}</p>
            </FieldFull>
          ) : null}
        </Section>

        <Section title="Banking (for payouts)">
          <p className="col-span-2 -mt-1 text-[11px] text-white/40">
            Visible to you only. Application-level encryption arrives before public launch.
          </p>
          {profile.bankAccountName ? (
            <Field icon={<Banknote className="h-3.5 w-3.5" />} label="Account holder" value={profile.bankAccountName} />
          ) : null}
          {profile.bankAccountNumber ? (
            <Field icon={<Banknote className="h-3.5 w-3.5" />} label="Account number" value={profile.bankAccountNumber} />
          ) : null}
          {profile.bankIfsc ? (
            <Field icon={<Banknote className="h-3.5 w-3.5" />} label="IFSC" value={profile.bankIfsc} />
          ) : null}
          {profile.upiId ? (
            <Field icon={<Banknote className="h-3.5 w-3.5" />} label="UPI ID" value={profile.upiId} />
          ) : null}
          {!profile.bankAccountNumber && !profile.upiId ? (
            <p className="col-span-2 text-sm text-white/55">No banking details on file. Ask admin to add them.</p>
          ) : null}
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="!p-6">
      <h3 className="text-xs uppercase tracking-wider text-[var(--color-brand-gold)] mb-3">{title}</h3>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">{children}</div>
    </Card>
  );
}

function Field({
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
      <p className="text-xs uppercase tracking-wider text-white/40 mb-0.5 inline-flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="text-white/85 break-all">{value}</p>
    </div>
  );
}

function FieldFull({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sm:col-span-2">
      <p className="text-xs uppercase tracking-wider text-white/40 mb-0.5 inline-flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <div className="text-white/85">{children}</div>
    </div>
  );
}
