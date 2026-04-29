import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";
const ISSUER = "astro";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

export type UserTokenPayload = {
  userId: string;
  role: string;
};

function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!raw) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET must be set to sign/verify JWTs");
  }
  return new TextEncoder().encode(raw);
}

export async function signUserToken(
  payload: UserTokenPayload,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: ALG })
    .setIssuer(ISSUER)
    .setSubject(payload.userId)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(getSecret());
}

export async function verifyUserToken(token: string): Promise<UserTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      algorithms: [ALG],
    });
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
