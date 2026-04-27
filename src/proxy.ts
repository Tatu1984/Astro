import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";

const { auth: proxyAuth } = NextAuth(authConfig);

export const proxy = proxyAuth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const loggedIn = Boolean(req.auth?.user);

  function deny(redirectTo: string) {
    const url = new URL(redirectTo, req.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Admin: ADMIN only
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!loggedIn) return deny("/login");
    if (role !== "ADMIN") return deny("/user");
    return NextResponse.next();
  }

  // Astrologer: ASTROLOGER (also accessible by ADMIN for support)
  if (pathname === "/astrologer" || pathname.startsWith("/astrologer/")) {
    if (!loggedIn) return deny("/login");
    if (role !== "ASTROLOGER" && role !== "ADMIN") return deny("/user");
    return NextResponse.next();
  }

  // User portal: any logged-in user
  if (pathname === "/user" || pathname.startsWith("/user/")) {
    if (!loggedIn) return deny("/login");
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|api/auth|login|register).*)",
  ],
};
