"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";

export interface LoginActionState {
  error: string | null;
}

export async function loginAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = (formData.get("callbackUrl") as string | null) ?? "/post-login";

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
    return { error: null };
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.type === "CredentialsSignin") {
        return { error: "Invalid email or password." };
      }
      return { error: `Sign-in failed (${err.type}).` };
    }
    throw err;
  }
}
