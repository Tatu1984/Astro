"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/frontend/components/ui/shadcn/button";
import { Input } from "@/frontend/components/ui/shadcn/input";
import { Label } from "@/frontend/components/ui/shadcn/label";
import { Textarea } from "@/frontend/components/ui/shadcn/textarea";

const LANGUAGE_OPTIONS = [
  "Hindi", "English", "Bengali", "Tamil", "Telugu", "Marathi",
  "Kannada", "Gujarati", "Malayalam", "Punjabi", "Urdu", "Sanskrit",
];

const SPECIALTY_OPTIONS = [
  "Vedic", "Western", "Numerology", "Tarot", "Vastu", "Palmistry",
  "Marriage", "Career", "Health", "Finance", "Remedies", "Muhurta",
];

type Step = 1 | 2 | 3 | 4;

interface FormState {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  languages: string[];
  specialties: string[];
  yearsExperience: number;
  qualifications: string;
  bio: string;
}

export function AstrologerSignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    languages: [],
    specialties: [],
    yearsExperience: 0,
    qualifications: "",
    bio: "",
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArray(key: "languages" | "specialties", value: string) {
    setForm((prev) => {
      const cur = prev[key];
      return { ...prev, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });
  }

  function validateStep(s: Step): string | null {
    if (s === 1) {
      if (!form.email.includes("@")) return "Enter a valid email.";
      if (form.password.length < 8) return "Password must be at least 8 characters.";
    }
    if (s === 2) {
      if (form.fullName.trim().length < 1) return "Full name is required.";
      if (form.phone.trim().length < 6) return "Phone is required.";
      if (form.languages.length === 0) return "Pick at least one language.";
      if (form.specialties.length === 0) return "Pick at least one specialty.";
    }
    if (s === 3) {
      if (form.yearsExperience < 0 || form.yearsExperience > 80) return "Experience must be between 0 and 80 years.";
      if (form.qualifications.trim().length < 1) return "Tell us about your qualifications.";
      if (form.bio.trim().length < 1) return "A short bio is required.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(4, (s + 1) as Step) as Step);
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, (s - 1) as Step) as Step);
  }

  async function submit() {
    const err = validateStep(3);
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/astrologer/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Signup failed.");
        setSubmitting(false);
        return;
      }
      // Persist token client-side so /astrologer/onboarding can call APIs
      // even before NextAuth issues a session cookie.
      if (typeof data.token === "string") {
        try {
          localStorage.setItem("astro.bearer", data.token);
        } catch {
          // ignore storage failures
        }
      }
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-[var(--color-brand-aqua)]/15 grid place-items-center text-[var(--color-brand-aqua)]">
          ✓
        </div>
        <h2 className="text-xl font-semibold">Application received</h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          You&apos;re signed up. Next: upload your KYC documents (Aadhaar, PAN, selfie) so our team
          can verify your identity. This usually takes 24-48 hours.
        </p>
        <Button
          variant="default"
          size="lg"
          className="w-full"
          onClick={() => router.push("/astrologer/onboarding")}
        >
          Next: upload your KYC documents
        </Button>
        <p className="text-xs text-[var(--color-ink-muted)]">
          You can also{" "}
          <Link href="/login" className="underline">
            sign in
          </Link>{" "}
          later to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="flex items-center justify-between text-xs text-[var(--color-ink-muted)] mb-4">
        {[1, 2, 3, 4].map((n) => (
          <li
            key={n}
            className={`flex-1 text-center ${
              n === step ? "text-[var(--color-brand-gold)] font-semibold" : ""
            }`}
          >
            <span
              className={`inline-grid place-items-center h-6 w-6 rounded-full text-[10px] mr-1.5 ${
                n <= step
                  ? "bg-[var(--color-brand-gold)] text-black"
                  : "border border-[var(--color-border)]"
              }`}
            >
              {n}
            </span>
            {["Account", "Identity", "Experience", "Submit"][n - 1]}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              minLength={8}
              required
            />
            <p className="text-[10px] text-[var(--color-ink-muted)]">At least 8 characters.</p>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              required
            />
          </div>
          <ChipSelect
            label="Languages you consult in"
            options={LANGUAGE_OPTIONS}
            selected={form.languages}
            onToggle={(v) => toggleArray("languages", v)}
          />
          <ChipSelect
            label="Specialties"
            options={SPECIALTY_OPTIONS}
            selected={form.specialties}
            onToggle={(v) => toggleArray("specialties", v)}
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="yearsExperience">Years of experience</Label>
            <Input
              id="yearsExperience"
              type="number"
              min={0}
              max={80}
              value={form.yearsExperience}
              onChange={(e) => update("yearsExperience", Number(e.target.value) || 0)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qualifications">Qualifications</Label>
            <Textarea
              id="qualifications"
              rows={3}
              placeholder="e.g. Jyotish Acharya, Banaras Hindu University, 2012"
              value={form.qualifications}
              onChange={(e) => update("qualifications", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Short bio</Label>
            <Textarea
              id="bio"
              rows={5}
              placeholder="Tell clients about your approach, lineage, signature techniques."
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm space-y-1.5">
            <Row label="Email" value={form.email} />
            <Row label="Name" value={form.fullName} />
            <Row label="Phone" value={form.phone} />
            <Row label="Languages" value={form.languages.join(", ")} />
            <Row label="Specialties" value={form.specialties.join(", ")} />
            <Row label="Experience" value={`${form.yearsExperience} years`} />
            <Row label="Qualifications" value={form.qualifications} />
            <Row label="Bio" value={form.bio} />
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">
            By submitting, you agree to verify your identity (Aadhaar / PAN / selfie) before going
            live. Astrologer accounts must be approved by our team.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-[var(--color-brand-rose)]">{error}</p> : null}

      <div className="flex justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={back}
          disabled={step === 1 || submitting}
        >
          Back
        </Button>
        {step < 4 ? (
          <Button type="button" variant="default" size="default" onClick={next} disabled={submitting}>
            Next
          </Button>
        ) : (
          <Button type="button" variant="default" size="default" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit application"}
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-[var(--color-ink-muted)] pt-2">
        Already have an astrologer account?{" "}
        <Link href="/login" className="text-[var(--color-brand-gold)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function ChipSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                on
                  ? "border-[var(--color-brand-gold)] bg-[var(--color-brand-gold)]/15 text-[var(--color-brand-gold)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <span className="text-[var(--color-ink-muted)]">{label}</span>
      <span className="text-[var(--color-ink)] break-words">{value || "—"}</span>
    </div>
  );
}
