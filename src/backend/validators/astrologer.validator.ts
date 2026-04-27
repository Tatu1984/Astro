import { z } from "zod";

export const KycTypeSchema = z.enum([
  "PAN",
  "AADHAAR",
  "PASSPORT",
  "VOTER_ID",
  "DRIVING_LICENSE",
]);

export const AstrologerStatusSchema = z.enum(["PENDING", "ACTIVE", "SUSPENDED"]);

const PhoneRegex = /^\+?[0-9 \-()]{6,20}$/;
const PostalRegex = /^[A-Za-z0-9 \-]{3,12}$/;
const IfscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UpiRegex = /^[\w.\-]{2,}@[\w.\-]{2,}$/;

export const CreateAstrologerSchema = z.object({
  // Account
  email: z.string().email().max(254).toLowerCase().trim(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120).trim(),

  // Contact
  phone: z.string().regex(PhoneRegex, "invalid phone"),
  alternatePhone: z.string().regex(PhoneRegex).optional().or(z.literal("")),

  // Address
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().regex(PostalRegex, "invalid postal code"),
  country: z.string().length(2).default("IN"),

  // KYC
  kycType: KycTypeSchema,
  kycNumber: z.string().min(4).max(40),

  // Professional
  qualifications: z.string().max(2000).optional().or(z.literal("")),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  specialties: z.array(z.string().min(1).max(40)).max(20).default([]),
  bio: z.string().max(2000).optional().or(z.literal("")),

  // Banking
  bankAccountName: z.string().max(120).optional().or(z.literal("")),
  bankAccountNumber: z
    .string()
    .regex(/^[0-9]{6,20}$/, "invalid account number")
    .optional()
    .or(z.literal("")),
  bankIfsc: z.string().regex(IfscRegex, "invalid IFSC").optional().or(z.literal("")),
  upiId: z.string().regex(UpiRegex, "invalid UPI id").optional().or(z.literal("")),
});

export type CreateAstrologerInput = z.infer<typeof CreateAstrologerSchema>;
