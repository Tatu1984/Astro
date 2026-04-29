import { redirect } from "next/navigation";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { listNotesForClient } from "@/backend/services/client-note.service";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";
import { prisma } from "@/backend/database/client";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";

import { ClientNotesPanel } from "./client-notes-panel";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const me = await getAuthedUser();
  if (!me) redirect("/login");
  if (me.role !== "ASTROLOGER" && me.role !== "ADMIN") redirect("/login");
  const profile = await requireOwnAstrologerProfile(me.userId);
  const { userId } = await params;

  const [client, bookings, notes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    }),
    prisma.booking.findMany({
      where: { astrologerProfileId: profile.id, userId },
      orderBy: { scheduledAt: "desc" },
      include: { service: { select: { title: true, kind: true, durationMin: true } } },
    }),
    listNotesForClient(profile.id, userId),
  ]);

  if (!client) {
    return (
      <>
        <TopBar title="Client" subtitle="Not found" />
        <div className="p-6">
          <Card>This client doesn&apos;t exist or hasn&apos;t booked you.</Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={client.name ?? "Client"} subtitle={client.email ?? "—"} />
      <div className="p-6 grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold text-[var(--color-brand-gold)] mb-3">Booking history</h3>
            {bookings.length === 0 ? (
              <p className="text-sm text-white/55">No bookings with you yet.</p>
            ) : (
              <ul className="text-sm divide-y divide-[var(--color-border)]">
                {bookings.map((b) => (
                  <li key={b.id} className="py-2.5 flex items-baseline justify-between gap-3">
                    <div>
                      <p className="text-white">{b.service.title}</p>
                      <p className="text-xs text-white/55">
                        {new Date(b.scheduledAt).toLocaleString()} · {b.durationMin}m · {b.service.kind}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-white/55">{b.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <ClientNotesPanel
          clientUserId={userId}
          bookings={bookings.map((b) => ({ id: b.id, label: `${b.service.title} · ${new Date(b.scheduledAt).toLocaleDateString()}` }))}
          initialNotes={notes.map((n) => ({
            id: n.id,
            content: n.content,
            bookingId: n.bookingId,
            createdAt: n.createdAt.toISOString(),
            updatedAt: n.updatedAt.toISOString(),
          }))}
        />
      </div>
    </>
  );
}
