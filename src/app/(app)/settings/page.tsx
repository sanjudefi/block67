export const dynamic = "force-dynamic";

import { cookies }  from "next/headers";
import { getToken } from "next-auth/jwt";
import { db }       from "@/lib/db";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const cookieStore = cookies();
  const token = await getToken({
    req: {
      cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])),
      headers: { cookie: cookieStore.toString() },
    } as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  const userId = token?.sub ?? null;

  const user = userId
    ? await db.user.findUnique({
        where:  { id: userId },
        select: { id: true, name: true, email: true, walletAddress: true, role: true, emailVerified: true },
      })
    : null;

  return <SettingsClient user={user ?? {}} />;
}
