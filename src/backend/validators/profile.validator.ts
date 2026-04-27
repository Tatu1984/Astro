import { z } from "zod";

export const ProfileKindSchema = z.enum([
  "SELF",
  "PARTNER",
  "CHILD",
  "FRIEND",
  "CELEBRITY",
  "OTHER",
]);

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const TimeString = z.string().regex(/^\d{2}:\d{2}$/, "expected HH:MM");

export const CreateProfileSchema = z
  .object({
    kind: ProfileKindSchema.default("SELF"),
    fullName: z.string().min(1).max(120).trim(),
    birthDate: DateString,
    birthTime: TimeString.optional(),
    unknownTime: z.boolean().default(false),
    birthPlace: z.string().min(1).max(200),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    timezone: z.string().min(1).max(60),
    gender: z.string().max(40).optional().or(z.literal("")),
    notes: z.string().max(1000).optional().or(z.literal("")),
    isPrivate: z.boolean().default(true),
  })
  .refine(
    (v) => v.unknownTime || (typeof v.birthTime === "string" && v.birthTime.length > 0),
    { message: "birthTime is required unless unknownTime is true", path: ["birthTime"] },
  );

export type CreateProfileInput = z.infer<typeof CreateProfileSchema>;
