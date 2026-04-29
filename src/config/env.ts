import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database (NeonDB Postgres) — Phase 0
  DATABASE_URL: z.string().url(),

  // Auth — Phase 1 (Auth.js v5 reads AUTH_SECRET; legacy alias kept)
  AUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  // Python compute microservice — Phase 1
  COMPUTE_BASE_URL: z.string().url().optional(),
  COMPUTE_SHARED_SECRET: z.string().min(16).optional(),

  // Geocoding — Phase 1
  OPENCAGE_API_KEY: z.string().optional(),

  // Application-level field encryption (KYC, bank). 32 bytes base64.
  ENCRYPTION_KEY: z.string().optional(),

  // LLM providers — Phase 2
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Email — Phase 2
  RESEND_API_KEY: z.string().optional(),

  // Object storage — Phase 2
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),

  // S3-compatible storage (Cloudflare R2 by default) — Phase 4.
  // S3_ENDPOINT is the full URL e.g. https://<account>.r2.cloudflarestorage.com
  // S3_REGION defaults to "auto" for R2.
  // S3_PUBLIC_BASE_URL is optional — only set for public buckets.
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_PUBLIC_BASE_URL: z.string().url().optional(),

  // Redis — Phase 3
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Marketplace — Phase 3
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  DAILY_API_KEY: z.string().optional(),
  DAILY_DOMAIN: z.string().optional(),
  ASTROLOGER_PLATFORM_FEE_PCT: z.coerce.number().min(0).max(100).default(20),
  CONSULT_BUFFER_MINUTES: z.coerce.number().min(0).default(5),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Environment validation failed. See details above.");
}

export const env = parsed.data;
export type Env = z.infer<typeof EnvSchema>;
