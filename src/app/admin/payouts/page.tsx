import { listAllPayouts } from "@/backend/services/payout.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { CardLight } from "@/frontend/components/ui/CardLight";
import { PayoutActions } from "./payout-actions";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const payouts = await listAllPayouts({});
  const requested = payouts.filter((p) => p.status === "REQUESTED");
  const others = payouts.filter((p) => p.status !== "REQUESTED");

  return (
    <>
      <TopBar title="Admin · payouts" subtitle={`${requested.length} pending review`} light initials="A" />
      <div className="p-6 max-w-5xl space-y-6">
        <section>
          <h2 className="text-sm uppercase tracking-wider text-[var(--color-ink-muted-light)] mb-2">Pending review</h2>
          <CardLight className="!p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-2-light)]">
                <tr className="text-left text-[var(--color-ink-muted-light)]">
                  <th className="px-4 py-2">Astrologer</th>
                  <th className="px-4 py-2">Bank / UPI</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2">Requested</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {requested.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--color-border-light)]">
                    <td className="px-4 py-2">{p.astrologerProfile?.fullName ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">
                      {p.astrologerProfile?.bankAccountName ?? p.astrologerProfile?.upiId ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right">₹{p.amountInr}</td>
                    <td className="px-4 py-2 text-xs">{p.requestedAt.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">
                      <PayoutActions payoutId={p.id} />
                    </td>
                  </tr>
                ))}
                {requested.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-[var(--color-ink-muted-light)]">Nothing pending.</td></tr>
                ) : null}
              </tbody>
            </table>
          </CardLight>
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-wider text-[var(--color-ink-muted-light)] mb-2">History</h2>
          <CardLight className="!p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-2-light)]">
                <tr className="text-left text-[var(--color-ink-muted-light)]">
                  <th className="px-4 py-2">Astrologer</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {others.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--color-border-light)]">
                    <td className="px-4 py-2">{p.astrologerProfile?.fullName ?? "—"}</td>
                    <td className="px-4 py-2">{p.status}</td>
                    <td className="px-4 py-2 text-right">₹{p.amountInr}</td>
                    <td className="px-4 py-2 text-xs">{(p.completedAt ?? p.requestedAt).toLocaleString()}</td>
                  </tr>
                ))}
                {others.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-[var(--color-ink-muted-light)]">No history yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </CardLight>
        </section>
      </div>
    </>
  );
}
