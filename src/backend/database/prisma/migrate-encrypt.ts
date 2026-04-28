/**
 * One-shot migration: encrypt any AstrologerProfile sensitive fields that
 * are still in plaintext (no "v1:" prefix). Run once after introducing the
 * encryption layer:
 *
 *   node --env-file=.env.local --import tsx src/backend/database/prisma/migrate-encrypt.ts
 *
 * Idempotent — already-encrypted rows are skipped.
 */

import { prisma } from "../client";
import { encryptField, isEncrypted } from "@/backend/utils/crypto.util";

async function main() {
  const rows = await prisma.astrologerProfile.findMany({
    select: { id: true, kycNumber: true, bankAccountNumber: true, bankIfsc: true, upiId: true },
  });

  let updated = 0;
  for (const r of rows) {
    const data: Record<string, string | null> = {};
    if (r.kycNumber && !isEncrypted(r.kycNumber)) data.kycNumber = encryptField(r.kycNumber)!;
    if (r.bankAccountNumber && !isEncrypted(r.bankAccountNumber)) data.bankAccountNumber = encryptField(r.bankAccountNumber);
    if (r.bankIfsc && !isEncrypted(r.bankIfsc)) data.bankIfsc = encryptField(r.bankIfsc);
    if (r.upiId && !isEncrypted(r.upiId)) data.upiId = encryptField(r.upiId);

    if (Object.keys(data).length === 0) continue;
    await prisma.astrologerProfile.update({ where: { id: r.id }, data });
    updated += 1;
    console.log(`  ✓ ${r.id} (${Object.keys(data).join(", ")})`);
  }

  console.log(`done. encrypted ${updated} of ${rows.length} rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
