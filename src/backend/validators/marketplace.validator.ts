import { z } from "zod";

export const ServiceKindSchema = z.enum(["CHAT", "VOICE", "VIDEO", "REPORT"]);

export const CreateServiceSchema = z.object({
  kind: ServiceKindSchema,
  title: z.string().min(1).max(120).trim(),
  description: z.string().max(4000).optional(),
  durationMin: z.number().int().min(5).max(240),
  priceInr: z.number().int().min(0).max(1000000),
  isActive: z.boolean().default(true),
});
export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;

export const UpdateServiceSchema = CreateServiceSchema.partial();
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;

export const ScheduleSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMinutes: z.number().int().min(0).max(60 * 24),
  endMinutes: z.number().int().min(0).max(60 * 24),
  timezone: z.string().min(1).max(60),
}).refine((v) => v.endMinutes > v.startMinutes, {
  message: "endMinutes must be > startMinutes",
});
export type ScheduleSlotInput = z.infer<typeof ScheduleSlotSchema>;

export const ReplaceScheduleSchema = z.object({
  slots: z.array(ScheduleSlotSchema).max(7 * 24),
});
export type ReplaceScheduleInput = z.infer<typeof ReplaceScheduleSchema>;

export const ScheduleExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isAvailable: z.boolean(),
  startMinutes: z.number().int().min(0).max(60 * 24).optional(),
  endMinutes: z.number().int().min(0).max(60 * 24).optional(),
});
export type ScheduleExceptionInput = z.infer<typeof ScheduleExceptionSchema>;

export const CreateBookingSchema = z.object({
  astrologerProfileId: z.string().min(1),
  serviceId: z.string().min(1),
  scheduledAt: z.string().datetime(),
});
export type CreateBookingInputDto = z.infer<typeof CreateBookingSchema>;

export const ReviewSubmitSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const PayoutRequestSchema = z.object({
  amountInr: z.number().int().min(1),
});

export const RazorpayVerifySchema = z.object({
  bookingId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const RazorpayOrderRequestSchema = z.object({
  bookingId: z.string().min(1),
});

export const ConsultDirectoryQuerySchema = z.object({
  language: z.string().optional(),
  specialty: z.string().optional(),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  kind: ServiceKindSchema.optional(),
});
