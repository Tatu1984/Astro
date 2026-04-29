"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/frontend/components/ui/shadcn/button";
import { Card } from "@/frontend/components/ui/Card";

type KycKind =
  | "AADHAAR_FRONT"
  | "AADHAAR_BACK"
  | "PAN"
  | "SELFIE_PHOTO"
  | "QUALIFICATION_CERT"
  | "EXPERIENCE_PROOF"
  | "OTHER";

type DocStatus = "PENDING" | "APPROVED" | "REJECTED" | "RESUBMIT_REQUESTED";

interface DocRow {
  id: string;
  kind: KycKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: DocStatus;
  reviewerNoteAdmin: string | null;
  reviewedAt: Date | string | null;
  createdAt: Date | string;
  previewUrl: string;
}

interface Props {
  required: KycKind[];
  optional: KycKind[];
  documents: DocRow[];
  onboardingStep: string;
}

const KIND_LABEL: Record<KycKind, string> = {
  AADHAAR_FRONT: "Aadhaar (front)",
  AADHAAR_BACK: "Aadhaar (back)",
  PAN: "PAN card",
  SELFIE_PHOTO: "Live selfie",
  QUALIFICATION_CERT: "Qualification certificate",
  EXPERIENCE_PROOF: "Experience proof",
  OTHER: "Other",
};

const STATUS_TONE: Record<DocStatus, string> = {
  PENDING: "border-[var(--color-border)] bg-white/5 text-white/70",
  APPROVED: "border-[var(--color-brand-aqua)]/40 bg-[var(--color-brand-aqua)]/10 text-[var(--color-brand-aqua)]",
  REJECTED: "border-[var(--color-brand-rose)]/40 bg-[var(--color-brand-rose)]/10 text-[var(--color-brand-rose)]",
  RESUBMIT_REQUESTED: "border-[var(--color-brand-gold)]/40 bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)]",
};

export function OnboardingChecklist({ required, optional, documents, onboardingStep }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  const byKind = new Map<KycKind, DocRow[]>();
  for (const d of documents) {
    const list = byKind.get(d.kind) ?? [];
    list.push(d);
    byKind.set(d.kind, list);
  }

  const requiredCovered = required.every((kind) => {
    const list = byKind.get(kind) ?? [];
    return list.some((d) => d.status !== "REJECTED");
  });

  async function submitForReview() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/astrologer/onboarding/submit", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed.");
      } else {
        refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const submitted = onboardingStep === "KYC_SUBMITTED" || onboardingStep === "UNDER_REVIEW" || onboardingStep === "APPROVED";

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="font-semibold text-[var(--color-brand-gold)] mb-1">Required documents</h2>
        <p className="text-xs text-white/55 mb-3">
          Upload clear, in-focus images. JPG / PNG / HEIC / PDF. 10 MB max each.
        </p>
        <div className="space-y-3">
          {required.map((kind) => (
            <DocSlot
              key={kind}
              kind={kind}
              docs={byKind.get(kind) ?? []}
              onChange={refresh}
              required
            />
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-[var(--color-brand-gold)] mb-1">Optional but recommended</h2>
        <p className="text-xs text-white/55 mb-3">
          These speed up admin review and unlock your full profile faster.
        </p>
        <div className="space-y-3">
          {optional.map((kind) => (
            <DocSlot
              key={kind}
              kind={kind}
              docs={byKind.get(kind) ?? []}
              onChange={refresh}
            />
          ))}
        </div>
      </Card>

      {error ? <p className="text-sm text-[var(--color-brand-rose)]">{error}</p> : null}

      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white">
            {submitted
              ? "Submitted for review"
              : requiredCovered
                ? "Ready to submit"
                : "Some required documents are missing"}
          </p>
          <p className="text-xs text-white/55">
            {submitted
              ? "Our team will email you once a decision is made."
              : "Once you submit, the admin team reviews each document."}
          </p>
        </div>
        <Button
          variant="default"
          size="lg"
          disabled={!requiredCovered || submitted || submitting || pending}
          onClick={submitForReview}
        >
          {submitted ? "Submitted" : submitting ? "Submitting…" : "Submit for review"}
        </Button>
      </div>
    </div>
  );
}

function DocSlot({
  kind,
  docs,
  onChange,
  required,
}: {
  kind: KycKind;
  docs: DocRow[];
  onChange: () => void;
  required?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = docs[0];

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      const res = await fetch("/api/astrologer/kyc/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
      } else {
        onChange();
      }
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function onDelete() {
    if (!latest) return;
    if (latest.status !== "PENDING") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/astrologer/kyc/${latest.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Delete failed.");
      } else {
        onChange();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-medium text-white">
            {KIND_LABEL[kind]}
            {required ? <span className="text-[var(--color-brand-rose)] ml-1">*</span> : null}
          </p>
          {latest ? (
            <p className="text-[10px] text-white/45">
              {latest.fileName} · {(latest.sizeBytes / 1024).toFixed(0)} KB
            </p>
          ) : (
            <p className="text-[10px] text-white/45">Not uploaded yet.</p>
          )}
        </div>
        {latest ? (
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_TONE[latest.status]}`}
          >
            {latest.status === "RESUBMIT_REQUESTED" ? "Re-upload" : latest.status.toLowerCase()}
          </span>
        ) : null}
      </div>

      {latest && latest.contentType.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={latest.previewUrl}
          alt={KIND_LABEL[kind]}
          className="mb-2 max-h-40 rounded border border-[var(--color-border)] object-contain bg-black/30"
        />
      ) : null}
      {latest && latest.contentType === "application/pdf" ? (
        <a
          href={latest.previewUrl}
          target="_blank"
          rel="noreferrer"
          className="mb-2 inline-block text-xs underline text-white/70"
        >
          View PDF
        </a>
      ) : null}

      {latest?.reviewerNoteAdmin ? (
        <p className="text-xs text-[var(--color-brand-rose)] mb-2">
          Reviewer note: {latest.reviewerNoteAdmin}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <label className="cursor-pointer rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-white/80 hover:text-white">
          {latest ? "Replace" : "Upload"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif,application/pdf"
            className="hidden"
            disabled={busy}
            onChange={onUpload}
          />
        </label>
        {latest && latest.status === "PENDING" ? (
          <Button variant="outline" size="sm" onClick={onDelete} disabled={busy}>
            Delete
          </Button>
        ) : null}
        {busy ? <span className="text-[10px] text-white/45">Working…</span> : null}
      </div>
      {error ? <p className="text-xs text-[var(--color-brand-rose)] mt-2">{error}</p> : null}
    </div>
  );
}
