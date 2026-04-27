import { z } from "zod";

export const SignupSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120).trim().optional(),
});

export type SignupInput = z.infer<typeof SignupSchema>;
