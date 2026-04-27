import bcrypt from "bcryptjs";

import { prisma } from "@/backend/database/client";

import type { SignupInput } from "@/backend/validators/auth.validator";

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function signupWithEmailPassword(input: SignupInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AuthError(409, "an account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
    },
    select: { id: true, email: true, name: true },
  });

  return user;
}
