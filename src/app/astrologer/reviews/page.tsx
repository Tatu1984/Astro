import { redirect } from "next/navigation";
import { Star } from "lucide-react";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { listReviewsForAstrologer } from "@/backend/services/review.service";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";
import { prisma } from "@/backend/database/client";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";

export default async function ReviewsPage() {
  const me = await getAuthedUser();
  if (!me) redirect("/login");
  const profile = await requireOwnAstrologerProfile(me.userId);

  const [reviews, profileFull] = await Promise.all([
    listReviewsForAstrologer(profile.id, { take: 50 }),
    prisma.astrologerProfile.findUnique({
      where: { id: profile.id },
      select: { averageRating: true, ratingCount: true },
    }),
  ]);

  return (
    <>
      <TopBar title="Reviews" subtitle="Client feedback" />
      <div className="p-6 space-y-6">
        <Card className="!p-4">
          <div className="flex items-baseline gap-3">
            <Star className="h-5 w-5 text-[var(--color-brand-gold)]" />
            <span className="text-2xl font-semibold text-white">
              {profileFull?.averageRating?.toFixed(1) ?? "—"}
            </span>
            <span className="text-sm text-white/55">
              ({profileFull?.ratingCount ?? 0} review{profileFull?.ratingCount === 1 ? "" : "s"})
            </span>
          </div>
        </Card>

        <div className="space-y-2">
          {reviews.map((r) => (
            <Card key={r.id} className="!p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-white">{r.user.name ?? "Client"}</span>
                <span className="text-xs text-white/45">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
                <span className="ml-auto text-[var(--color-brand-gold)] text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              </div>
              {r.comment ? <p className="text-sm text-white/75">{r.comment}</p> : null}
            </Card>
          ))}
          {reviews.length === 0 ? (
            <Card className="!p-4">
              <p className="text-sm text-white/55">No reviews yet.</p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
