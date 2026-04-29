import type { BookingStatus, Prisma } from "@prisma/client";

import { prisma } from "@/backend/database/client";
import { env } from "@/config/env";

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
  return tx.booking.update({ where: { id }, data });
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
