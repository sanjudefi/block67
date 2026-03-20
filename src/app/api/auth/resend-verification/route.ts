// POST /api/auth/resend-verification — resend email verification link
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, email: true, name: true, emailVerified: true },
  });

  if (!user?.email) {
    return NextResponse.json({ error: "No email on account" }, { status: 400 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ error: "Email already verified" }, { status: 400 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const exp   = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.user.update({
    where: { id: user.id },
    data:  { emailVerificationToken: token, emailVerificationTokenExp: exp },
  });

  sendVerificationEmail(user.email, user.name ?? "", token).catch(console.error);

  return NextResponse.json({ ok: true });
}
