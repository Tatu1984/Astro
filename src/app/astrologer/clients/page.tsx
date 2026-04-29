import { redirect } from "next/navigation";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";
import { prisma } from "@/backend/database/client";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";

export default async function ClientsPage() {
  const me = await getAuthedUser();
  if (!me) redirect("/login");
  const profile = await requireOwnAstrologerProfile(me.userId);

  const grouped = await prisma.booking.groupBy({
    by: ["userId"],
    where: { astrologerProfileId: profile.id, status: { in: ["COMPLETED", "CONFIRMED", "IN_PROGRESS"] } },
    _count: { _all: true },
    _max: { scheduledAt: true },
  });

  const userIds = grouped.map((g) => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const rows = grouped
    .map((g) => ({
      user: userMap.get(g.userId),
      total: g._count._all,
      lastSession: g._max.scheduledAt,
    }))
    .sort((a, b) => (b.lastSession?.getTime() ?? 0) - (a.lastSession?.getTime() ?? 0));

  return (
    <>
      <TopBar title="Clients" subtitle="People you've consulted with" />
      <div className="p-6">
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-white/55">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2 text-right">Sessions</th>
                <th className="px-4 py-2">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user?.id ?? Math.random()} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-2 text-white">{r.user?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-white/70">{r.user?.email ?? "—"}</td>
                  <td className="px-4 py-2 text-right text-white/85">{r.total}</td>
                  <td className="px-4 py-2 text-white/55">{r.lastSession ? r.lastSession.toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-white/45">No clients yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
