import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import {
  SettingsError,
  changePassword,
  getSettings,
  updateAccount,
  updateNotificationPrefs,
  updateReadingStyle,
  updateTheme,
} from "@/backend/services/settings.service";

export async function GET() {
  const me = await getAuthedUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const settings = await getSettings(me.userId);
    return NextResponse.json(settings);
  } catch (err) {
    if (err instanceof SettingsError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

const PatchSchema = z.object({
  account: z
    .object({
      name: z.string().max(120).nullable().optional(),
    })
    .optional(),
  password: z
    .object({
      oldPassword: z.string().min(1).max(200),
      newPassword: z.string().min(8).max(200),
    })
    .optional(),
  readingStyle: z.enum(["WESTERN", "VEDIC"]).optional(),
  themePreference: z.enum(["light", "dark", "system"]).optional(),
  notificationPrefs: z
    .object({
      booking: z.boolean().optional(),
      payout: z.boolean().optional(),
      message: z.boolean().optional(),
      kyc: z.boolean().optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const me = await getAuthedUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const { account, password, readingStyle, themePreference, notificationPrefs } = parsed.data;
    if (account && account.name !== undefined) {
      await updateAccount(me.userId, account.name ?? null);
    }
    if (password) {
      await changePassword(me.userId, password.oldPassword, password.newPassword);
    }
    if (readingStyle) {
      await updateReadingStyle(me.userId, readingStyle);
    }
    if (themePreference) {
      await updateTheme(me.userId, themePreference);
    }
    if (notificationPrefs) {
      await updateNotificationPrefs(me.userId, notificationPrefs);
    }
    const settings = await getSettings(me.userId);
    return NextResponse.json(settings);
  } catch (err) {
    if (err instanceof SettingsError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
