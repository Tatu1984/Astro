import { redirect } from "next/navigation";

import { auth } from "@/auth";

/**
 * Lightweight server-side router. After a successful sign-in we land here
 * (rather than hardcoding /user in the login form), read the session role,
 * and forward to the appropriate dashboard.
 */
export default async function PostLoginPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  switch (session.user.role) {
    case "ADMIN":
      redirect("/admin");
    case "ASTROLOGER":
      redirect("/astrologer");
    case "MODERATOR":
      redirect("/admin");
    default:
      redirect("/user");
  }
}
