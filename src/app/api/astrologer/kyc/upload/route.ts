import { NextRequest, NextResponse } from "next/server";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import {
  ALLOWED_MIME,
  KycError,
  MAX_FILE_BYTES,
  uploadKycDocument,
} from "@/backend/services/kyc.service";
import type { KycDocumentKind } from "@prisma/client";

const ALLOWED_KINDS: KycDocumentKind[] = [
  "AADHAAR_FRONT",
  "AADHAAR_BACK",
  "PAN",
  "SELFIE_PHOTO",
  "QUALIFICATION_CERT",
  "EXPERIENCE_PROOF",
  "OTHER",
];

export async function POST(req: NextRequest) {
  let me;
  try {
    me = await requireRole("ASTROLOGER");
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  const kindRaw = form.get("kind");
  const file = form.get("file");
  if (typeof kindRaw !== "string" || !ALLOWED_KINDS.includes(kindRaw as KycDocumentKind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }
  const kind = kindRaw as KycDocumentKind;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `file too large (${file.size} > ${MAX_FILE_BYTES} bytes)` },
      { status: 413 },
    );
  }
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: `unsupported content type: ${file.type}`, allowed: ALLOWED_MIME },
      { status: 415 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const doc = await uploadKycDocument({
      userId: me.userId,
      kind,
      fileName: file.name || `${kind.toLowerCase()}.bin`,
      contentType: file.type,
      bytes,
    });
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err) {
    if (err instanceof KycError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
