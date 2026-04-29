export type BookingStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "REFUNDED";

export interface BookingResponse {
  id: string;
  userId: string;
  astrologerProfileId: string;
  serviceId: string;
  scheduledAt: string;
  durationMin: number;
  status: BookingStatus;
  priceInr: number;
  platformFeeInr: number;
  astrologerNetInr: number;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
}
