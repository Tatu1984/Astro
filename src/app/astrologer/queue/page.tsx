import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Video } from "lucide-react";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { listBookingsForAstrologer } from "@/backend/services/booking.service";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Badge } from "@/frontend/components/ui/Badge";
import { Card } from "@/frontend/components/ui/Card";
import { Button } from "@/frontend/components/ui/Button";
import { env } from "@/config/env";

const STATUS_TONE: Record<string, "aqua" | "gold" | "rose"> = {
  CONFIRMED: "aqua",
  IN_PROGRESS: "gold",
  COMPLETED: "aqua",
  PENDING_PAYMENT: "gold",
  CANCELLED: "rose",
  NO_SHOW: "rose",
  REFUNDED: "rose",
};

function fmtTime(d: Date): string {
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isWithinJoinWindow(scheduledAt: Date, durationMin: number): boolean {
  const now = Date.now();
  const start = scheduledAt.getTime();
  const buffer = env.CONSULT_BUFFER_MINUTES * 60 * 1000;
  const end = start + (durationMin + 30) * 60 * 1000;
  return now >= start - buffer && now <= end;
}

export default async function AstrologerQueuePage() {
  const me = await getAuthedUser();
  if (!me) redirect("/login");
  const profile = await requireOwnAstrologerProfile(me.userId);

  const bookings = await listBookingsForAstrologer(profile.id);

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday.getTime() + 24 * 3600 * 1000);

  const today = bookings.filter(
    (b) => b.scheduledAt >= startOfToday && b.scheduledAt < endOfToday,
  );
  const upcoming = bookings.filter((b) => b.scheduledAt.getTime() > now && b.scheduledAt >= endOfToday);
  const past = bookings.filter((b) => b.scheduledAt.getTime() <= now);

  return (
    <>
      <TopBar title="Queue" subtitle="Today, upcoming & past sessions" />
      <div className="p-6 space-y-8">
        <Section title="Today" bookings={today} />
        <Section title="Upcoming" bookings={upcoming} />
        <Section title="Past" bookings={past.slice(0, 25)} />
      </div>
    </>
  );
}

type BookingRow = Awaited<ReturnType<typeof listBookingsForAstrologer>>[number];

function Section({ title, bookings }: { title: string; bookings: BookingRow[] }) {
  return (
    <section>
      <h2 className="text-sm uppercase tracking-wider text-white/50 mb-3">{title}</h2>
      {bookings.length === 0 ? (
        <Card className="!p-4">
          <p className="text-sm text-white/55">No sessions in this bucket.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <Card key={b.id} className="!p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white">{b.user.name ?? b.user.email ?? b.user.id}</div>
                  <div className="text-xs text-white/55">
                    {b.service?.title ?? "Service"} · {b.service?.kind ?? "?"} · {b.durationMin}min
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/65">
                  <Calendar className="h-3.5 w-3.5" />
                  {fmtTime(b.scheduledAt)}
                </div>
                <Badge tone={STATUS_TONE[b.status] ?? "gold"}>{b.status}</Badge>
                {b.status === "CONFIRMED" && isWithinJoinWindow(b.scheduledAt, b.durationMin) ? (
                  <Link href={`/astrologer/session/${b.id}`}>
                    <Button size="sm">
                      <Video className="h-3.5 w-3.5 mr-1" /> Start
                    </Button>
                  </Link>
                ) : b.status === "IN_PROGRESS" ? (
                  <Link href={`/astrologer/session/${b.id}`}>
                    <Button size="sm">Resume</Button>
                  </Link>
                ) : b.status === "COMPLETED" ? (
                  <Link href={`/astrologer/session/${b.id}`}>
                    <Button size="sm" variant="outline">View</Button>
                  </Link>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
