import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";

const PROTECTED_PREFIXES = ["/user", "/admin", "/astrologer"];

const { auth: proxyAuth } = NextAuth(authConfig);

export const proxy = proxyAuth((req) => {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!needsAuth) return NextResponse.next();
  if (req.auth?.user) return NextResponse.next();

  const loginUrl = new URL("/login", req.nextUrl);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|api/auth|login).*)",
  ],
};
