import { z } from "zod";

const PhoneRegex = /^\+?[0-9 \-()]{6,20}$/;

export const AstrologerSignupSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  password: z.string().min(8).max(200),
  fullName: z.string().min(1).max(120).trim(),
  phone: z.string().regex(PhoneRegex, "invalid phone"),
  languages: z.array(z.string().min(1).max(40)).min(1).max(20),
  specialties: z.array(z.string().min(1).max(40)).min(1).max(20),
  yearsExperience: z.number().int().min(0).max(80),
  qualifications: z.string().min(1).max(2000),
  bio: z.string().min(1).max(2000),
});

export type AstrologerSignupInput = z.infer<typeof AstrologerSignupSchema>;
