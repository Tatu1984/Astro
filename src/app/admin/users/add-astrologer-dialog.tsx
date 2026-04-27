"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button as ShadcnButton } from "@/frontend/components/ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/frontend/components/ui/shadcn/dialog";
import { Input } from "@/frontend/components/ui/shadcn/input";
import { Label } from "@/frontend/components/ui/shadcn/label";
import { Textarea } from "@/frontend/components/ui/shadcn/textarea";

type FormState = {
  email: string;
  password: string;
  name: string;
  phone: string;
  alternatePhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  kycType: "PAN" | "AADHAAR" | "PASSPORT" | "VOTER_ID" | "DRIVING_LICENSE";
  kycNumber: string;
  qualifications: string;
  yearsExperience: string;
  specialties: string;
  bio: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  upiId: string;
};

const INITIAL: FormState = {
  email: "",
  password: "",
  name: "",
  phone: "",
  alternatePhone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
  kycType: "PAN",
  kycNumber: "",
  qualifications: "",
  yearsExperience: "",
  specialties: "",
  bio: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  upiId: "",
};

export function AddAstrologerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      ...form,
      yearsExperience: form.yearsExperience === ""
        ? undefined
        : Number(form.yearsExperience),
      specialties: form.specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    const res = await fetch("/api/admin/astrologers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string; details?: unknown } | null;
      setError(body?.error ?? `failed (${res.status})`);
      return;
    }

    setForm(INITIAL);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <ShadcnButton variant="default" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Astrologer
          </ShadcnButton>
        }
      />

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Onboard astrologer</DialogTitle>
          <DialogDescription>
            Creates a new account with role ASTROLOGER. KYC and banking details are stored for payouts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6 pt-2">
          <Section title="Account">
            <Field label="Full name" required>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required minLength={1} maxLength={120} />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required maxLength={254} />
            </Field>
            <Field label="Initial password" required hint="Min 8 chars. Share once via your usual secure channel.">
              <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} />
            </Field>
          </Section>

          <Section title="Contact">
            <Field label="Phone" required>
              <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required placeholder="+91 98765 43210" />
            </Field>
            <Field label="Alternate phone">
              <Input type="tel" value={form.alternatePhone} onChange={(e) => set("alternatePhone", e.target.value)} />
            </Field>
            <Field label="Address line 1" required>
              <Input value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} required />
            </Field>
            <Field label="Address line 2">
              <Input value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} />
            </Field>
            <Row>
              <Field label="City" required>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} required />
              </Field>
              <Field label="State" required>
                <Input value={form.state} onChange={(e) => set("state", e.target.value)} required />
              </Field>
            </Row>
            <Row>
              <Field label="Postal code" required>
                <Input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} required />
              </Field>
              <Field label="Country (ISO-2)" required>
                <Input value={form.country} onChange={(e) => set("country", e.target.value.toUpperCase())} required maxLength={2} />
              </Field>
            </Row>
          </Section>

          <Section title="KYC">
            <Row>
              <Field label="KYC type" required>
                <select
                  value={form.kycType}
                  onChange={(e) => set("kycType", e.target.value as FormState["kycType"])}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="PAN">PAN</option>
                  <option value="AADHAAR">Aadhaar</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="VOTER_ID">Voter ID</option>
                  <option value="DRIVING_LICENSE">Driving license</option>
                </select>
              </Field>
              <Field label="KYC number" required>
                <Input value={form.kycNumber} onChange={(e) => set("kycNumber", e.target.value)} required />
              </Field>
            </Row>
          </Section>

          <Section title="Professional">
            <Field label="Qualifications" hint="Degrees, certifications, courses">
              <Textarea rows={3} value={form.qualifications} onChange={(e) => set("qualifications", e.target.value)} />
            </Field>
            <Row>
              <Field label="Years of experience">
                <Input type="number" min={0} max={80} value={form.yearsExperience} onChange={(e) => set("yearsExperience", e.target.value)} />
              </Field>
              <Field label="Specialties" hint="Comma-separated, e.g. vedic, tarot">
                <Input value={form.specialties} onChange={(e) => set("specialties", e.target.value)} />
              </Field>
            </Row>
            <Field label="Bio">
              <Textarea rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
            </Field>
          </Section>

          <Section title="Banking (for payouts)">
            <Field label="Account holder name">
              <Input value={form.bankAccountName} onChange={(e) => set("bankAccountName", e.target.value)} />
            </Field>
            <Row>
              <Field label="Account number">
                <Input value={form.bankAccountNumber} onChange={(e) => set("bankAccountNumber", e.target.value)} inputMode="numeric" />
              </Field>
              <Field label="IFSC">
                <Input value={form.bankIfsc} onChange={(e) => set("bankIfsc", e.target.value.toUpperCase())} placeholder="HDFC0001234" />
              </Field>
            </Row>
            <Field label="UPI ID" hint="e.g. astrologer@upi">
              <Input value={form.upiId} onChange={(e) => set("upiId", e.target.value)} />
            </Field>
          </Section>

          {error ? (
            <p className="text-sm text-[var(--color-brand-rose)]">{error}</p>
          ) : null}

          <DialogFooter>
            <ShadcnButton type="button" variant="outline" size="default" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </ShadcnButton>
            <ShadcnButton type="submit" variant="default" size="default" disabled={submitting}>
              {submitting ? "Onboarding…" : "Create astrologer"}
            </ShadcnButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required ? <span className="text-[var(--color-brand-rose)]">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
