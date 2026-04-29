import { listAllBookings } from "@/backend/services/booking.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { CardLight } from "@/frontend/components/ui/CardLight";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const bookings = await listAllBookings({});

  return (
    <>
      <TopBar title="Admin · bookings" subtitle={`${bookings.length} recent`} light initials="A" />
      <div className="p-6 max-w-6xl">
        <CardLight className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2-light)]">
              <tr className="text-left text-[var(--color-ink-muted-light)]">
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Astrologer</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">₹</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-t border-[var(--color-border-light)]">
                  <td className="px-4 py-2 text-[var(--color-ink-light)]">
                    {b.scheduledAt.toLocaleString("en-GB", {
                      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2">{b.user?.name ?? b.user?.email ?? "—"}</td>
                  <td className="px-4 py-2">{b.astrologerProfile?.fullName ?? "—"}</td>
                  <td className="px-4 py-2">{b.service?.title ?? "—"} <span className="text-[var(--color-ink-muted-light)]">({b.service?.kind})</span></td>
                  <td className="px-4 py-2">{b.status}</td>
                  <td className="px-4 py-2 text-right">{b.priceInr}</td>
                </tr>
              ))}
              {bookings.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-[var(--color-ink-muted-light)]">No bookings yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </CardLight>
      </div>
    </>
  );
}
