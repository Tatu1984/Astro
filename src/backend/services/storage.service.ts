import { promises as fs } from "node:fs";
import path from "node:path";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/config/env";

export type StorageBody = Buffer | Uint8Array | string;

export interface UploadObjectInput {
  key: string;
  body: StorageBody;
  contentType: string;
  contentLength?: number;
  metadata?: Record<string, string>;
}

export interface UploadObjectResult {
  key: string;
  etag: string;
}

export class StorageError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "StorageError";
  }
}

const STUB_DIR = "/tmp/astro-storage";

function isStubMode(): boolean {
  return !(
    env.S3_ACCESS_KEY_ID &&
    env.S3_SECRET_ACCESS_KEY &&
    env.S3_BUCKET &&
    env.S3_ENDPOINT
  );
}

function ensureNotProductionStub(): void {
  if (isStubMode() && env.NODE_ENV === "production") {
    throw new StorageError(
      500,
      "storage misconfigured: S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY/S3_BUCKET/S3_ENDPOINT required in production",
    );
  }
}

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
      // R2 returns its own bucket; force path-style URLs for compatibility.
      forcePathStyle: true,
    });
  }
  return _client;
}

function stubPath(key: string): string {
  return path.join(STUB_DIR, key);
}

async function stubWrite(input: UploadObjectInput): Promise<UploadObjectResult> {
  const filePath = stubPath(input.key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const buf =
    typeof input.body === "string" ? Buffer.from(input.body, "utf8") : Buffer.from(input.body);
  await fs.writeFile(filePath, buf);
  // Persist metadata + content-type alongside so signed-URL stub can hint at it.
  await fs.writeFile(`${filePath}.meta.json`, JSON.stringify({
    contentType: input.contentType,
    metadata: input.metadata ?? {},
  }, null, 2));
  // eslint-disable-next-line no-console
  console.log(`[storage-stub] uploadObject key=${input.key} bytes=${buf.byteLength} type=${input.contentType}`);
  return { key: input.key, etag: `stub-${buf.byteLength}` };
}

export async function uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
  if (isStubMode()) {
    ensureNotProductionStub();
    return stubWrite(input);
  }

  const body =
    typeof input.body === "string" ? Buffer.from(input.body, "utf8") : Buffer.from(input.body);

  const cmd = new PutObjectCommand({
    Bucket: env.S3_BUCKET!,
    Key: input.key,
    Body: body,
    ContentType: input.contentType,
    ContentLength: input.contentLength ?? body.byteLength,
    Metadata: input.metadata,
  });
  const res = await getClient().send(cmd);
  return { key: input.key, etag: (res.ETag ?? "").replace(/"/g, "") };
}

export async function getSignedUrl(key: string, expirySec = 900): Promise<string> {
  if (isStubMode()) {
    ensureNotProductionStub();
    // eslint-disable-next-line no-console
    console.log(`[storage-stub] getSignedUrl key=${key} expirySec=${expirySec}`);
    return `file://${stubPath(key)}`;
  }
  if (env.S3_PUBLIC_BASE_URL) {
    return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }
  const cmd = new GetObjectCommand({ Bucket: env.S3_BUCKET!, Key: key });
  return awsGetSignedUrl(getClient(), cmd, { expiresIn: expirySec });
}

export async function deleteObject(key: string): Promise<void> {
  if (isStubMode()) {
    ensureNotProductionStub();
    const filePath = stubPath(key);
    await fs.rm(filePath, { force: true });
    await fs.rm(`${filePath}.meta.json`, { force: true });
    // eslint-disable-next-line no-console
    console.log(`[storage-stub] deleteObject key=${key}`);
    return;
  }
  await getClient().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET!, Key: key }));
}

export async function readObjectBuffer(key: string): Promise<Buffer> {
  if (isStubMode()) {
    ensureNotProductionStub();
    return fs.readFile(stubPath(key));
  }
  const res = await getClient().send(new GetObjectCommand({ Bucket: env.S3_BUCKET!, Key: key }));
  if (!res.Body) throw new StorageError(404, `object not found: ${key}`);
  // Body is a streaming type in node — collect chunks via the SDK helper.
  const chunks: Buffer[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function isStorageStubMode(): boolean {
  return isStubMode();
}
