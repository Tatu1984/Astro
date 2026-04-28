/**
 * Application-level field encryption for sensitive astrologer data
 * (KYC numbers, bank account numbers, IFSC, UPI handles).
 *
 * Format: "v1:<iv-base64>:<ciphertext-base64>:<authTag-base64>"
 *   - v1 prefix lets us detect already-encrypted vs legacy plaintext
 *     during the migration window
 *   - AES-256-GCM with a 12-byte random IV per record
 *   - 16-byte authentication tag verifies integrity
 *
 * NeonDB encrypts at rest. This adds confidentiality against:
 *   - Anyone with read access to a Postgres dump
 *   - Accidental log/query exposure
 * It does NOT protect against an attacker who has both the DB and the
 * ENCRYPTION_KEY env var.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGO = "aes-256-gcm" as const;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY not set. Generate one with `openssl rand -base64 32` and add to .env.local + Vercel.",
    );
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must decode to 32 bytes, got ${buf.length}`);
  }
  cachedKey = buf;
  return buf;
}

export function encryptField(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined) return null;
  if (plain === "") return null;
  if (typeof plain !== "string") throw new Error("encryptField expects a string");

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptField(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(`${VERSION}:`)) {
    // Legacy plaintext (pre-encryption) — return as-is. Will be re-encrypted
    // on next write.
    return stored;
  }
  const parts = stored.split(":");
  if (parts.length !== 4) throw new Error("malformed encrypted field");
  const [, ivB64, encB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

/** True when the value looks like a v1-encrypted blob. */
export function isEncrypted(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.startsWith(`${VERSION}:`);
}
