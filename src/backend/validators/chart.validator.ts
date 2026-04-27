import { z } from "zod";

export const HouseSystemSchema = z.enum([
  "PLACIDUS",
  "WHOLE_SIGN",
  "KOCH",
  "EQUAL",
  "VEDIC_EQUAL",
]);

export const AstroSystemSchema = z.enum(["WESTERN", "VEDIC", "BOTH"]);

export const NatalRequestSchema = z.object({
  birth_datetime_utc: z.iso.datetime({ offset: false }),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  house_system: HouseSystemSchema.default("PLACIDUS"),
  system: AstroSystemSchema.default("BOTH"),
  unknown_time: z.boolean().default(false),
});

export type NatalInput = z.infer<typeof NatalRequestSchema>;
