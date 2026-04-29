"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";

import { TopBar } from "@/frontend/components/portal/TopBar";
import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";
import type { AstrologerListItem, ServiceKind } from "@/shared/types/consult";

const KINDS: ServiceKind[] = ["CHAT", "VOICE", "VIDEO", "REPORT"];

export default function ConsultDirectoryPage() {
  const [astrologers, setAstrologers] = useState<AstrologerListItem[]>([]);
  const [kind, setKind] = useState<ServiceKind | "">("");
  const [language, setLanguage] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [loading, setLoading] = useState(true);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (kind) p.set("kind", kind);
    if (language) p.set("language", language);
    if (specialty) p.set("specialty", specialty);
    if (priceMin) p.set("priceMin", priceMin);
    if (priceMax) p.set("priceMax", priceMax);
    return p.toString();
  }, [kind, language, specialty, priceMin, priceMax]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/consult/astrologers${queryString ? `?${queryString}` : ""}`)
      .then((r) => r.json())
      .then((d: { astrologers: AstrologerListItem[] }) => setAstrologers(d.astrologers ?? []))
      .finally(() => setLoading(false));
  }, [queryString]);

  return (
    <>
      <TopBar title="Consult" subtitle="Talk to a verified astrologer" />
      <div className="p-6 grid lg:grid-cols-[260px_1fr] gap-6">
        <aside>
          <Card className="!p-4 space-y-4">
            <h3 className="font-semibold text-[var(--color-brand-gold)]">Filters</h3>
            <div>
              <label className="text-xs uppercase text-white/45">Type</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {KINDS.map((k) => (
                  <button
                    key={k}
                    onClick={() => setKind(kind === k ? "" : k)}
                    className={
                      "px-2 py-1 text-xs rounded-md border " +
                      (kind === k
                        ? "bg-[var(--color-brand-violet)] border-transparent text-white"
                        : "border-[var(--color-border)] text-white/70 hover:bg-white/5")
                    }
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Language" value={language} onChange={setLanguage} placeholder="e.g. Hindi" />
            <Field label="Specialty" value={specialty} onChange={setSpecialty} placeholder="e.g. Marriage" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Min ₹" value={priceMin} onChange={setPriceMin} type="number" />
              <Field label="Max ₹" value={priceMax} onChange={setPriceMax} type="number" />
            </div>
          </Card>
        </aside>

        <section>
          {loading ? (
            <p className="text-sm text-white/55">Loading…</p>
          ) : astrologers.length === 0 ? (
            <Card className="!p-4">
              <p className="text-sm text-white/55">No astrologers match your filters.</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {astrologers.map((a) => (
                <Card key={a.id} className="!p-4">
                  <div className="flex items-baseline gap-2">
                    <h4 className="font-semibold text-white">{a.fullName}</h4>
                    {a.ratingCount > 0 ? (
                      <span className="text-xs text-[var(--color-brand-gold)] inline-flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-current" />
                        {a.averageRating.toFixed(1)} ({a.ratingCount})
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-white/55 mt-0.5">{a.city}</p>
                  {a.specialties?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {a.specialties.slice(0, 3).map((s) => (
                        <span key={s} className="text-[10px] uppercase tracking-wider text-white/55 border border-[var(--color-border)] rounded px-1.5 py-0.5">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {a.bio ? <p className="text-xs text-white/65 mt-2 line-clamp-2">{a.bio}</p> : null}
                  <div className="mt-3 text-xs text-white/65">
                    {a.services.length} service{a.services.length === 1 ? "" : "s"}
                    {a.services.length ? ` · from ₹${Math.min(...a.services.map((s) => s.priceInr))}` : ""}
                  </div>
                  <div className="mt-3">
                    <Link href={`/user/consult/${a.id}`}>
                      <Button size="sm" className="w-full">View profile</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase text-white/45 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-[var(--color-border)] rounded px-2 py-1 text-sm text-white"
      />
    </div>
  );
}
