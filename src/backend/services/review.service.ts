import { prisma } from "@/backend/database/client";

export class ReviewError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

export type SubmitReviewInput = {
  bookingId: string;
  userId: string;
  rating: number;
  comment?: string;
};

export async function submitReview(input: SubmitReviewInput) {
  if (input.rating < 1 || input.rating > 5) {
    throw new ReviewError(400, "rating must be between 1 and 5");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: { id: true, userId: true, astrologerProfileId: true, status: true, review: true },
  });
  if (!booking) throw new ReviewError(404, "booking not found");
  if (booking.userId !== input.userId) throw new ReviewError(403, "not your booking");
  if (booking.status !== "COMPLETED") {
    throw new ReviewError(400, "can only review completed bookings");
  }
  if (booking.review) throw new ReviewError(409, "review already submitted");

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        bookingId: booking.id,
        userId: input.userId,
        astrologerProfileId: booking.astrologerProfileId,
        rating: input.rating,
        comment: input.comment,
      },
    });

    const agg = await tx.review.aggregate({
      where: { astrologerProfileId: booking.astrologerProfileId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.astrologerProfile.update({
      where: { id: booking.astrologerProfileId },
      data: {
        averageRating: agg._avg.rating ?? 0,
        ratingCount: agg._count._all,
      },
    });

    return review;
  });
}

export async function listReviewsForAstrologer(astrologerProfileId: string, opts: { take?: number; skip?: number } = {}) {
  return prisma.review.findMany({
    where: { astrologerProfileId },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 20,
    skip: opts.skip ?? 0,
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });
}
