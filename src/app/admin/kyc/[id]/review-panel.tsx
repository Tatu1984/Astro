"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/frontend/components/ui/shadcn/button";

type DocStatus = "PENDING" | "APPROVED" | "REJECTED" | "RESUBMIT_REQUESTED";

interface Doc {
  id: string;
  kind: string;
  status: DocStatus;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  reviewerNoteAdmin: string | null;
  previewUrl: string;
  createdAt: Date | string;
}

interface Props {
  astrologerProfileId: string;
  documents: Doc[];
  onboardingStep: string;
  status: string;
}

export function KycReviewPanel({ astrologerProfileId, documents, onboardingStep, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function reviewDoc(docId: string, action: "approve" | "reject" | "request-resubmit") {
    setBusyId(docId);
    setError(null);
    try {
      let body: BodyInit | null = null;
      const headers: Record<string, string> = {};
      if (action !== "approve") {
        const reason = window.prompt(
          action === "reject" ? "Why is this document rejected?" : "What needs to be re-uploaded?",
        );
        if (!reason) {
          setBusyId(null);
          return;
        }
        body = JSON.stringify({ reason });
        headers["content-type"] = "application/json";
      }
      const res = await fetch(
        `/api/admin/kyc/${astrologerProfileId}/${docId}/${action}`,
        { method: "POST", body, headers },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `${action} failed`);
      } else {
        refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function decide(decision: "APPROVE_ALL" | "REJECT_ALL") {
    if (decision === "REJECT_ALL" && !decisionNote.trim()) {
      setError("Reject reason is required.");
      return;
    }
    setDecisionBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kyc/${astrologerProfileId}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, note: decisionNote || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "decision failed");
      } else {
        refresh();
      }
    } finally {
      setDecisionBusy(false);
    }
  }

  const decided = onboardingStep === "APPROVED" || onboardingStep === "REJECTED";

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {documents.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted-light)]">No documents uploaded yet.</p>
        ) : null}
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface-light)] p-4 space-y-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{doc.kind.replaceAll("_", " ")}</p>
                <p className="text-[10px] text-[var(--color-ink-muted-light)]">
                  {doc.fileName} · {(doc.sizeBytes / 1024).toFixed(0)} KB · {doc.contentType}
                </p>
              </div>
              <span className={`text-[10px] uppercase tracking-wider rounded border px-2 py-0.5 ${
                doc.status === "APPROVED"
                  ? "border-green-600/40 bg-green-600/10 text-green-700"
                  : doc.status === "REJECTED"
                    ? "border-red-600/40 bg-red-600/10 text-red-700"
                    : doc.status === "RESUBMIT_REQUESTED"
                      ? "border-amber-600/40 bg-amber-600/10 text-amber-700"
                      : "border-[var(--color-border-light)] text-[var(--color-ink-muted-light)]"
              }`}>
                {doc.status.toLowerCase()}
              </span>
            </div>
            {doc.contentType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={doc.previewUrl}
                alt={doc.kind}
                className="max-h-72 rounded border border-[var(--color-border-light)] object-contain bg-black/5"
              />
            ) : doc.contentType === "application/pdf" ? (
              <iframe
                src={doc.previewUrl}
                title={doc.kind}
                className="h-96 w-full rounded border border-[var(--color-border-light)]"
              />
            ) : (
              <a
                href={doc.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline text-[var(--color-brand-gold)]"
              >
                Open file
              </a>
            )}
            {doc.reviewerNoteAdmin ? (
              <p className="text-xs text-[var(--color-ink-muted-light)]">Note: {doc.reviewerNoteAdmin}</p>
            ) : null}
            {!decided ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => reviewDoc(doc.id, "approve")}
                  disabled={busyId === doc.id || doc.status === "APPROVED" || pending}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reviewDoc(doc.id, "reject")}
                  disabled={busyId === doc.id || pending}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reviewDoc(doc.id, "request-resubmit")}
                  disabled={busyId === doc.id || pending}
                >
                  Request re-upload
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface-light)] p-4 space-y-2">
        <p className="text-sm font-semibold">Final decision</p>
        <p className="text-xs text-[var(--color-ink-muted-light)]">
          {decided
            ? `Already decided — current status ${status.toLowerCase()}, step ${onboardingStep.toLowerCase()}.`
            : "Approve activates the astrologer (status ACTIVE). Reject suspends the account and closes onboarding."}
        </p>
        {!decided ? (
          <>
            <textarea
              className="w-full rounded border border-[var(--color-border-light)] bg-white p-2 text-sm"
              rows={2}
              placeholder="Optional note (required for rejection)"
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="default"
                variant="outline"
                disabled={decisionBusy || pending}
                onClick={() => decide("REJECT_ALL")}
              >
                Reject astrologer
              </Button>
              <Button
                size="default"
                variant="default"
                disabled={decisionBusy || pending}
                onClick={() => decide("APPROVE_ALL")}
              >
                Approve astrologer
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
