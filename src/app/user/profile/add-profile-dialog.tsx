"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { MapPicker, type PickedPlace } from "@/frontend/components/profile/MapPicker";
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

type Kind = "SELF" | "PARTNER" | "CHILD" | "FRIEND" | "CELEBRITY" | "OTHER";

const INITIAL = {
  kind: "SELF" as Kind,
  fullName: "",
  birthDate: "",
  birthTime: "",
  unknownTime: false,
  gender: "",
  isPrivate: true,
};

export function AddProfileDialog({ buttonLabel = "Add profile" }: { buttonLabel?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL);
  const [place, setPlace] = useState<PickedPlace | null>(null);

  function reset() {
    setForm(INITIAL);
    setPlace(null);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!place) {
      setError("Pick a birth place on the map.");
      return;
    }
    if (!form.unknownTime && !form.birthTime) {
      setError("Enter a birth time, or check 'I don't know my birth time'.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: form.kind,
        fullName: form.fullName,
        birthDate: form.birthDate,
        birthTime: form.unknownTime ? undefined : form.birthTime,
        unknownTime: form.unknownTime,
        birthPlace: place.displayName,
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone,
        gender: form.gender || undefined,
        isPrivate: form.isPrivate,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? `failed (${res.status})`);
      return;
    }

    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={
          <ShadcnButton variant="default" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            {buttonLabel}
          </ShadcnButton>
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a birth profile</DialogTitle>
          <DialogDescription>
            Enter birth date, time and place. Your natal chart is computed from this.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kind">Profile is for</Label>
              <select
                id="kind"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as Kind })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="SELF">Myself</option>
                <option value="PARTNER">Partner</option>
                <option value="CHILD">Child</option>
                <option value="FRIEND">Friend</option>
                <option value="CELEBRITY">Celebrity</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Birth date</Label>
              <Input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthTime">Birth time (local)</Label>
              <Input
                id="birthTime"
                type="time"
                value={form.birthTime}
                onChange={(e) => setForm({ ...form, birthTime: e.target.value })}
                disabled={form.unknownTime}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.unknownTime}
              onChange={(e) => setForm({ ...form, unknownTime: e.target.checked, birthTime: e.target.checked ? "" : form.birthTime })}
            />
            I don&apos;t know my birth time (use noon as approximation)
          </label>

          <div className="space-y-1.5">
            <Label>Birth place</Label>
            <MapPicker value={place} onChange={setPlace} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender (optional)</Label>
            <Input
              id="gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              maxLength={40}
            />
          </div>

          {error ? <p className="text-sm text-[var(--color-brand-rose)]">{error}</p> : null}

          <DialogFooter>
            <ShadcnButton type="button" variant="outline" size="default" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </ShadcnButton>
            <ShadcnButton type="submit" variant="default" size="default" disabled={submitting}>
              {submitting ? "Saving…" : "Save profile"}
            </ShadcnButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
