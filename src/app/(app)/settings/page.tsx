export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const user = userId
    ? await db.user.findUnique({
        where:  { id: userId },
        select: { id: true, name: true, email: true, walletAddress: true, role: true },
      })
    : null;

  return <SettingsClient user={user ?? {}} />;
}
