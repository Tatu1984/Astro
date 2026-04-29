import type { BookingStatus, Prisma } from "@prisma/client";

import { prisma } from "@/backend/database/client";
import { env } from "@/config/env";
import { notify } from "@/backend/services/notification.service";

export class BookingError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "BookingError";
  }
}

const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW", "REFUNDED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  NO_SHOW: [],
  REFUNDED: [],
};

export type CreateBookingInput = {
  userId: string;
  astrologerProfileId: string;
  serviceId: string;
  scheduledAt: Date;
};

function computeFeeBreakdown(priceInr: number) {
  const platformFeeInr = Math.round((priceInr * env.ASTROLOGER_PLATFORM_FEE_PCT) / 100);
  const astrologerNetInr = priceInr - platformFeeInr;
  return { platformFeeInr, astrologerNetInr };
}

export async function createBooking(input: CreateBookingInput) {
  const service = await prisma.astrologerService.findUnique({
    where: { id: input.serviceId },
    include: { astrologerProfile: { select: { id: true, status: true } } },
  });
  if (!service) throw new BookingError(404, "service not found");
  if (!service.isActive) throw new BookingError(400, "service is not active");
  if (service.astrologerProfileId !== input.astrologerProfileId) {
    throw new BookingError(400, "service does not belong to this astrologer");
  }
  if (service.astrologerProfile.status !== "ACTIVE") {
    throw new BookingError(400, "astrologer is not currently accepting bookings");
  }

  if (input.scheduledAt.getTime() < Date.now()) {
    throw new BookingError(400, "scheduledAt must be in the future");
  }

  const fees = computeFeeBreakdown(service.priceInr);

  return prisma.booking.create({
    data: {
      userId: input.userId,
      astrologerProfileId: input.astrologerProfileId,
      serviceId: input.serviceId,
      scheduledAt: input.scheduledAt,
      durationMin: service.durationMin,
      status: "PENDING_PAYMENT",
      priceInr: service.priceInr,
      platformFeeInr: fees.platformFeeInr,
      astrologerNetInr: fees.astrologerNetInr,
    },
  });
}

export async function getBooking(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      service: true,
      astrologerProfile: {
        select: {
          id: true,
          fullName: true,
          city: true,
          languages: true,
          specialties: true,
          averageRating: true,
          ratingCount: true,
          user: { select: { id: true, name: true, image: true } },
        },
      },
      user: { select: { id: true, name: true, email: true, image: true } },
      consultSession: true,
      review: true,
    },
  });
}

type ListFilter = {
  status?: BookingStatus | BookingStatus[];
  from?: Date;
  to?: Date;
};

function buildWhere(base: Prisma.BookingWhereInput, filter: ListFilter): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = { ...base };
  if (filter.status) {
    where.status = Array.isArray(filter.status) ? { in: filter.status } : filter.status;
  }
  if (filter.from || filter.to) {
    where.scheduledAt = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    };
  }
  return where;
}

export async function listBookingsForUser(userId: string, filter: ListFilter = {}) {
  return prisma.booking.findMany({
    where: buildWhere({ userId }, filter),
    orderBy: { scheduledAt: "desc" },
    include: {
      service: { select: { id: true, title: true, kind: true, priceInr: true, durationMin: true } },
      astrologerProfile: {
        select: {
          id: true,
          fullName: true,
          averageRating: true,
          user: { select: { id: true, name: true, image: true } },
        },
      },
      review: { select: { id: true, rating: true } },
    },
  });
}

export async function listBookingsForAstrologer(astrologerProfileId: string, filter: ListFilter = {}) {
  return prisma.booking.findMany({
    where: buildWhere({ astrologerProfileId }, filter),
    orderBy: { scheduledAt: "desc" },
    include: {
      service: { select: { id: true, title: true, kind: true, durationMin: true } },
      user: { select: { id: true, name: true, email: true, image: true } },
      consultSession: { select: { id: true, startedAt: true, endedAt: true } },
    },
  });
}

export async function listAllBookings(filter: ListFilter = {}) {
  return prisma.booking.findMany({
    where: buildWhere({}, filter),
    orderBy: { scheduledAt: "desc" },
    take: 200,
    include: {
      service: { select: { id: true, title: true, kind: true } },
      astrologerProfile: { select: { id: true, fullName: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function transitionStatus(
  id: string,
  next: BookingStatus,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const current = await tx.booking.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!current) throw new BookingError(404, "booking not found");
  const allowed = BOOKING_TRANSITIONS[current.status];
  if (!allowed.includes(next)) {
    throw new BookingError(400, `cannot transition booking from ${current.status} to ${next}`);
  }
  const data: Prisma.BookingUpdateInput = { status: next };
  if (next === "COMPLETED") data.completedAt = new Date();
  if (next === "CANCELLED") data.cancelledAt = new Date();
  const updated = await tx.booking.update({ where: { id }, data });

  // Fire-and-forget: only when running outside a transaction, since tx
  // clients may not have completed by the time the notification writes
  // and we don't want a notify failure to roll back booking state.
  if (tx === prisma) {
    void emitBookingNotifications(updated.id, next).catch((err) =>
      console.warn("[booking.notify] failed", err),
    );
  }
  return updated;
}

async function emitBookingNotifications(bookingId: string, next: BookingStatus) {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      scheduledAt: true,
      astrologerProfile: { select: { userId: true, fullName: true } },
      service: { select: { title: true } },
      user: { select: { name: true } },
    },
  });
  if (!b) return;
  const astrologerUserId = b.astrologerProfile.userId;
  const userHref = `/user/consult/bookings/${b.id}`;
  const astroHref = `/astrologer/queue`;

  if (next === "CONFIRMED") {
    await Promise.all([
      notify({
        userId: b.userId,
        kind: "BOOKING_CONFIRMED",
        title: `Booking confirmed with ${b.astrologerProfile.fullName}`,
        body: `Your ${b.service.title} session is set for ${b.scheduledAt.toUTCString()}.`,
        payload: { href: userHref, bookingId: b.id },
      }),
      notify({
        userId: astrologerUserId,
        kind: "BOOKING_CONFIRMED",
        title: `New booking confirmed`,
        body: `${b.user.name ?? "A client"} booked ${b.service.title}.`,
        payload: { href: astroHref, bookingId: b.id },
      }),
    ]);
  } else if (next === "COMPLETED") {
    await notify({
      userId: b.userId,
      kind: "BOOKING_COMPLETED",
      title: "How was your session?",
      body: `Leave a review for ${b.astrologerProfile.fullName}.`,
      payload: { href: userHref, bookingId: b.id },
    });
  } else if (next === "CANCELLED") {
    await Promise.all([
      notify({
        userId: b.userId,
        kind: "BOOKING_CANCELLED",
        title: "Booking cancelled",
        body: `Your session with ${b.astrologerProfile.fullName} was cancelled.`,
        payload: { href: userHref, bookingId: b.id },
      }),
      notify({
        userId: astrologerUserId,
        kind: "BOOKING_CANCELLED",
        title: "Booking cancelled",
        body: `Session with ${b.user.name ?? "client"} was cancelled.`,
        payload: { href: astroHref, bookingId: b.id },
      }),
    ]);
  }
}

export async function cancelBooking(id: string, requesterUserId: string, isAdmin = false) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, userId: true, astrologerProfileId: true, status: true },
  });
  if (!booking) throw new BookingError(404, "booking not found");

  let allowed = isAdmin || booking.userId === requesterUserId;
  if (!allowed) {
    const profile = await prisma.astrologerProfile.findUnique({
      where: { id: booking.astrologerProfileId },
      select: { userId: true },
    });
    if (profile?.userId === requesterUserId) allowed = true;
  }
  if (!allowed) throw new BookingError(403, "not allowed to cancel this booking");

  return transitionStatus(id, "CANCELLED");
}
