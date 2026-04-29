"use client";

import { useEffect, useState } from "react";

import { TopBar } from "@/frontend/components/portal/TopBar";
import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";

type LedgerEntry = {
  id: string;
  kind: string;
  amountInr: number;
  refType: string;
  refId: string | null;
  balanceAfterInr: number;
  description: string | null;
  createdAt: string;
};

type EarningsResp = {
  totalEarnedInr: number;
  pendingPayoutInr: number;
  lifetimePayoutInr: number;
  walletBalanceInr: number;
  ledger: LedgerEntry[];
};

export default function EarningsPage() {
  const [data, setData] = useState<EarningsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [reqAmount, setReqAmount] = useState("");
  const [reqLoading, setReqLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/astrologer/earnings");
      if (!res.ok) throw new Error((await res.json()).error ?? "load failed");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function requestPayout() {
    if (!reqAmount) return;
    setReqLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/astrologer/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountInr: Number(reqAmount) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "request failed");
      setShowRequest(false);
      setReqAmount("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setReqLoading(false);
    }
  }

  return (
    <>
      <TopBar title="Earnings" subtitle="Wallet, ledger, and payouts" />
      <div className="p-6 space-y-6">
        {error ? <div className="text-sm text-[var(--color-brand-rose)]">{error}</div> : null}
        {loading || !data ? (
          <p className="text-sm text-white/55">Loading…</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-4 gap-3">
              <Kpi label="Wallet balance" value={data.walletBalanceInr} />
              <Kpi label="Lifetime earned" value={data.totalEarnedInr} />
              <Kpi label="Pending payout" value={data.pendingPayoutInr} />
              <Kpi label="Lifetime paid out" value={data.lifetimePayoutInr} />
            </div>

            <Card className="!p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--color-brand-gold)]">Ledger</h3>
                <Button size="sm" onClick={() => setShowRequest((s) => !s)}>
                  {showRequest ? "Cancel" : "Request payout"}
                </Button>
              </div>

              {showRequest ? (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="number"
                    value={reqAmount}
                    onChange={(e) => setReqAmount(e.target.value)}
                    placeholder="Amount in INR"
                    className="bg-white/5 border border-[var(--color-border)] rounded px-2 py-1 text-sm text-white"
                  />
                  <Button size="sm" onClick={requestPayout} disabled={reqLoading}>
                    {reqLoading ? "Submitting…" : "Submit"}
                  </Button>
                </div>
              ) : null}

              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-white/40">
                    <th className="py-1.5">Date</th>
                    <th>Kind</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Balance</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.map((e) => (
                    <tr key={e.id} className="border-t border-[var(--color-border)]">
                      <td className="py-1.5 text-white/65">{new Date(e.createdAt).toLocaleString()}</td>
                      <td className="text-white/80">{e.kind}</td>
                      <td className={e.amountInr >= 0 ? "text-[var(--color-brand-aqua)] text-right" : "text-[var(--color-brand-rose)] text-right"}>
                        {e.amountInr >= 0 ? "+" : ""}{e.amountInr}
                      </td>
                      <td className="text-white/80 text-right">{e.balanceAfterInr}</td>
                      <td className="text-white/55">{e.description ?? "—"}</td>
                    </tr>
                  ))}
                  {data.ledger.length === 0 ? (
                    <tr><td colSpan={5} className="py-4 text-white/40 text-center">No transactions yet.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card className="!p-4">
      <p className="text-xs uppercase tracking-wider text-white/45">{label}</p>
      <p className="text-xl font-semibold text-white mt-1">₹{value.toLocaleString()}</p>
    </Card>
  );
}
