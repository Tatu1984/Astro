import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";

import { getPublicAstrologer } from "@/backend/services/marketplace.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";

export default async function PublicAstrologerPage({
  params,
}: {
  params: Promise<{ astrologerId: string }>;
}) {
  const { astrologerId } = await params;
  const astro = await getPublicAstrologer(astrologerId);
  if (!astro) notFound();

  return (
    <>
      <TopBar title={astro.fullName} subtitle={`${astro.city ?? ""}${astro.country ? ", " + astro.country : ""}`} />
      <div className="p-6 grid lg:grid-cols-[1fr_360px] gap-6">
        <Card className="!p-6">
          <div className="flex items-baseline gap-3 mb-2">
            <h2 className="text-xl font-semibold text-white">{astro.fullName}</h2>
            {astro.ratingCount > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-sm text-[var(--color-brand-gold)]">
                <Star className="h-4 w-4 fill-current" />
                {astro.averageRating.toFixed(1)} ({astro.ratingCount})
              </span>
            ) : null}
          </div>
          {astro.qualifications ? <p className="text-sm text-white/70">{astro.qualifications}</p> : null}
          {astro.bio ? <p className="text-sm text-white/65 mt-3 leading-relaxed">{astro.bio}</p> : null}

          <div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">
            <Field label="Languages" value={astro.languages.join(", ") || "—"} />
            <Field label="Specialties" value={astro.specialties.join(", ") || "—"} />
            <Field label="Experience" value={astro.yearsExperience ? `${astro.yearsExperience} years` : "—"} />
          </div>

          <h3 className="mt-6 mb-2 text-sm uppercase tracking-wider text-white/45">Recent reviews</h3>
          <div className="space-y-2">
            {astro.reviews.length === 0 ? (
              <p className="text-xs text-white/45">No reviews yet.</p>
            ) : (
              astro.reviews.map((r) => (
                <div key={r.id} className="border border-[var(--color-border)] rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{r.user.name ?? "Client"}</span>
                    <span className="ml-auto text-[var(--color-brand-gold)] text-xs">
                      {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                    </span>
                  </div>
                  {r.comment ? <p className="text-xs text-white/70">{r.comment}</p> : null}
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="!p-4">
          <h3 className="font-semibold text-[var(--color-brand-gold)] mb-3">Services</h3>
          <div className="space-y-2">
            {astro.services.map((s) => (
              <div key={s.id} className="border border-[var(--color-border)] rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{s.title}</span>
                  <span className="text-sm text-[var(--color-brand-gold)]">₹{s.priceInr}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-white/45">{s.kind} · {s.durationMin}min</span>
                  <Link href={`/user/consult/book/${s.id}`}>
                    <Button size="sm">Book</Button>
                  </Link>
                </div>
              </div>
            ))}
            {astro.services.length === 0 ? (
              <p className="text-xs text-white/45">No services available.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-white/85">{value}</p>
    </div>
  );
}
