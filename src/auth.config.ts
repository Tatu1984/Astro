import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config — providers list intentionally empty here.
 * The full config (with Prisma adapter + bcryptjs Credentials provider)
 * lives in src/auth.ts and runs on the Node runtime.
 *
 * The middleware imports this bare config so it can verify JWTs without
 * pulling in Node-only modules (bcryptjs, @prisma/client) that crash
 * the Edge runtime.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
