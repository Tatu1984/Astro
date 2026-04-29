import bcrypt from "bcryptjs";
import type { Prisma, ReadingStyle } from "@prisma/client";

import { prisma } from "@/backend/database/client";

export class SettingsError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "SettingsError";
  }
}

export const NOTIFICATION_PREF_KEYS = [
  "booking",
  "payout",
  "message",
  "kyc",
] as const;
export type NotificationPrefKey = (typeof NOTIFICATION_PREF_KEYS)[number];
export type NotificationPrefs = Record<NotificationPrefKey, boolean>;

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  booking: true,
  payout: true,
  message: true,
  kyc: true,
};

export function normalizeNotificationPrefs(input: unknown): NotificationPrefs {
  const out: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS };
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const obj = input as Record<string, unknown>;
    for (const k of NOTIFICATION_PREF_KEYS) {
      if (typeof obj[k] === "boolean") out[k] = obj[k] as boolean;
    }
  }
  return out;
}

export async function getSettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      readingStyle: true,
      themePreference: true,
      notificationPrefs: true,
    },
  });
  if (!user) throw new SettingsError(404, "user not found");

  const profiles = await prisma.profile.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, fullName: true, kind: true },
    orderBy: { createdAt: "asc" },
  });

  const defaultProfileId = profiles[0]?.id ?? null;
  const theme: "light" | "dark" | "system" =
    user.themePreference === "light" || user.themePreference === "dark"
      ? user.themePreference
      : "system";

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      readingStyle: (user.readingStyle ?? "VEDIC") as ReadingStyle,
      themePreference: theme,
      notificationPrefs: normalizeNotificationPrefs(user.notificationPrefs),
    },
    profiles,
    defaultProfileId,
  };
}

export async function updateAccount(userId: string, name: string | null) {
  const trimmed = name?.trim() || null;
  return prisma.user.update({
    where: { id: userId },
    data: { name: trimmed },
    select: { id: true, name: true },
  });
}

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
) {
  if (newPassword.length < 8) {
    throw new SettingsError(400, "new password must be at least 8 characters");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    throw new SettingsError(400, "no password is set on this account");
  }
  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) throw new SettingsError(401, "current password is incorrect");
  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  return { ok: true };
}

export async function updateReadingStyle(userId: string, style: ReadingStyle) {
  return prisma.user.update({
    where: { id: userId },
    data: { readingStyle: style },
    select: { readingStyle: true },
  });
}

export async function updateTheme(userId: string, theme: "light" | "dark" | "system") {
  return prisma.user.update({
    where: { id: userId },
    data: { themePreference: theme },
    select: { themePreference: true },
  });
}

export async function updateNotificationPrefs(
  userId: string,
  patch: Partial<NotificationPrefs>,
) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  });
  if (!current) throw new SettingsError(404, "user not found");
  const merged: NotificationPrefs = {
    ...normalizeNotificationPrefs(current.notificationPrefs),
    ...patch,
  };
  await prisma.user.update({
    where: { id: userId },
    data: { notificationPrefs: merged as unknown as Prisma.InputJsonValue },
  });
  return merged;
}

export async function signOutEverywhere(userId: string) {
  const result = await prisma.session.deleteMany({ where: { userId } });
  return { revoked: result.count };
}
