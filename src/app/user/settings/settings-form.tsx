"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Card } from "@/frontend/components/ui/Card";
import { Button } from "@/frontend/components/ui/Button";

type ReadingStyle = "WESTERN" | "VEDIC";
type Theme = "light" | "dark" | "system";

export interface SettingsInitial {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    role: string;
    readingStyle: ReadingStyle;
    themePreference: Theme;
    notificationPrefs: {
      booking: boolean;
      payout: boolean;
      message: boolean;
      kyc: boolean;
    };
  };
  profiles: Array<{ id: string; fullName: string; kind: string }>;
  defaultProfileId: string | null;
}

async function patchSettings(body: Record<string, unknown>) {
  const res = await fetch("/api/user/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "request failed");
  }
  return res.json();
}

export function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.user.name ?? "");
  const [defaultProfileId, setDefaultProfileId] = useState(initial.defaultProfileId ?? "");
  const [readingStyle, setReadingStyle] = useState<ReadingStyle>(initial.user.readingStyle);
  const [theme, setTheme] = useState<Theme>(initial.user.themePreference);
  const [prefs, setPrefs] = useState(initial.user.notificationPrefs);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [, startSavingAccount] = useTransition();
  const [savingPw, setSavingPw] = useState(false);
  const [, startSavingStyle] = useTransition();
  const [, startSavingTheme] = useTransition();
  const [, startSavingPrefs] = useTransition();
  const [signingOut, setSigningOut] = useState(false);

  function saveAccount() {
    setAccountMsg(null);
    startSavingAccount(async () => {
      try {
        await patchSettings({ account: { name } });
        setAccountMsg("Saved.");
        router.refresh();
      } catch (err) {
        setAccountMsg(err instanceof Error ? err.message : "save failed");
      }
    });
  }

  async function savePassword() {
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: "new password and confirmation do not match" });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ ok: false, text: "new password must be at least 8 characters" });
      return;
    }
    setSavingPw(true);
    try {
      await patchSettings({ password: { oldPassword: oldPw, newPassword: newPw } });
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
      setPwMsg({ ok: true, text: "Password updated." });
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : "save failed" });
    } finally {
      setSavingPw(false);
    }
  }

  function saveDefaultProfile(id: string) {
    setDefaultProfileId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("astro_default_profile", id);
    }
  }

  function saveReadingStyle(style: ReadingStyle) {
    setReadingStyle(style);
    startSavingStyle(async () => {
      try {
        await patchSettings({ readingStyle: style });
      } catch {
        // surface noisily later if needed
      }
    });
  }

  function saveTheme(t: Theme) {
    setTheme(t);
    startSavingTheme(async () => {
      try {
        await patchSettings({ themePreference: t });
      } catch {
        // ignore
      }
    });
  }

  function togglePref(key: keyof typeof prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    startSavingPrefs(async () => {
      try {
        await patchSettings({ notificationPrefs: { [key]: next[key] } });
      } catch {
        // ignore
      }
    });
  }

  async function signOutEverywhere() {
    if (!confirm("Sign out from every device? You'll need to log in again here too.")) return;
    setSigningOut(true);
    try {
      const res = await fetch("/api/user/settings/sign-out-everywhere", { method: "POST" });
      if (res.ok) {
        router.push("/login");
      }
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="grid gap-6 max-w-3xl">
      <Card>
        <h2 className="text-lg font-semibold text-white">Account</h2>
        <p className="text-xs text-white/55 mt-1">Email is read-only. Update display name here.</p>
        <div className="mt-4 grid gap-3 max-w-md">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/55">Email</label>
            <input
              readOnly
              value={initial.user.email ?? ""}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-white/70"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/55">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-white"
              placeholder="Your name"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="gold" size="sm" onClick={saveAccount}>
              Save name
            </Button>
            {accountMsg ? <span className="text-xs text-white/65">{accountMsg}</span> : null}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-white">Password</h2>
        <p className="text-xs text-white/55 mt-1">Change your password — old password required.</p>
        <div className="mt-4 grid gap-3 max-w-md">
          <input
            type="password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            placeholder="Current password"
            className="w-full rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-white"
            autoComplete="current-password"
          />
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New password (8+ chars)"
            className="w-full rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-white"
            autoComplete="new-password"
          />
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-white"
            autoComplete="new-password"
          />
          <div className="flex items-center gap-3">
            <Button variant="gold" size="sm" onClick={savePassword} disabled={savingPw || !oldPw || !newPw}>
              {savingPw ? "Saving…" : "Update password"}
            </Button>
            {pwMsg ? (
              <span className={pwMsg.ok ? "text-xs text-emerald-400" : "text-xs text-red-400"}>
                {pwMsg.text}
              </span>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-white">Default profile</h2>
        <p className="text-xs text-white/55 mt-1">
          The chart workspace remembers your last-used profile; pick the default starting one here.
        </p>
        {initial.profiles.length === 0 ? (
          <p className="mt-3 text-sm text-white/60">No profiles yet — add one from the Profiles page.</p>
        ) : (
          <select
            value={defaultProfileId}
            onChange={(e) => saveDefaultProfile(e.target.value)}
            className="mt-4 max-w-md w-full rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-white"
          >
            {initial.profiles.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#1a1530]">
                {p.fullName} · {p.kind}
              </option>
            ))}
          </select>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-white">Reading style</h2>
        <p className="text-xs text-white/55 mt-1">
          Frame readings in a Vedic karma/dharma context, or in a Western psychological / self-actualization context.
        </p>
        <div className="mt-4 grid gap-2">
          <RadioRow
            checked={readingStyle === "VEDIC"}
            onChange={() => saveReadingStyle("VEDIC")}
            title="Indian / Vedic"
            description="Karma, dharma, life-stage and divine timing. Rashi, nakshatra, dasha framing."
          />
          <RadioRow
            checked={readingStyle === "WESTERN"}
            onChange={() => saveReadingStyle("WESTERN")}
            title="Western (psychological)"
            description="Personal growth, agency, conscious choice and individuation. Jungian archetypes."
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-white">Theme</h2>
        <p className="text-xs text-white/55 mt-1">Light, dark, or follow your operating system.</p>
        <div className="mt-4 inline-flex rounded-md border border-[var(--color-border)] bg-white/5 p-0.5">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => saveTheme(t)}
              className={
                "px-3 py-1.5 text-xs rounded " +
                (theme === t ? "bg-[var(--color-brand-violet)] text-white" : "text-white/65 hover:text-white")
              }
            >
              {t}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-white">In-app notifications</h2>
        <p className="text-xs text-white/55 mt-1">
          Choose which events surface in the bell icon. We never email you without an explicit opt-in.
        </p>
        <div className="mt-4 grid gap-2">
          <ToggleRow
            label="Booking updates"
            description="Confirmations, reminders, completions, cancellations."
            checked={prefs.booking}
            onChange={() => togglePref("booking")}
          />
          <ToggleRow
            label="Payout updates"
            description="Astrologer payout processed or rejected."
            checked={prefs.payout}
            onChange={() => togglePref("payout")}
          />
          <ToggleRow
            label="New messages"
            description="Chat replies and astrologer messages."
            checked={prefs.message}
            onChange={() => togglePref("message")}
          />
          <ToggleRow
            label="KYC status"
            description="Astrologer-only — KYC approvals and rejections."
            checked={prefs.kyc}
            onChange={() => togglePref("kyc")}
          />
        </div>
      </Card>

      <Card accent="rose">
        <h2 className="text-lg font-semibold text-white">Danger zone</h2>
        <p className="text-xs text-white/55 mt-1">
          Sign out from every browser and device. You&apos;ll need to log back in here too.
        </p>
        <div className="mt-4">
          <Button onClick={signOutEverywhere} disabled={signingOut} variant="ghost" size="sm">
            {signingOut ? "Signing out…" : "Sign out everywhere"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function RadioRow({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={
        "w-full text-left rounded-md border px-3 py-2.5 transition-colors " +
        (checked
          ? "border-[var(--color-brand-violet)] bg-[var(--color-brand-violet)]/10"
          : "border-[var(--color-border)] hover:bg-white/5")
      }
    >
      <div className="flex items-start gap-2">
        <span
          className={
            "mt-1 h-3 w-3 rounded-full border " +
            (checked ? "border-[var(--color-brand-violet)] bg-[var(--color-brand-violet)]" : "border-white/40")
          }
        />
        <div>
          <p className="text-sm text-white">{title}</p>
          <p className="text-xs text-white/55">{description}</p>
        </div>
      </div>
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2.5">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-white/55">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={
          "relative h-6 w-10 shrink-0 rounded-full transition-colors " +
          (checked ? "bg-[var(--color-brand-violet)]" : "bg-white/10")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform " +
            (checked ? "translate-x-4" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}
