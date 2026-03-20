// GET /api/auth/verify-email?token=xxx
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid-token", req.url));
  }

  try {
    const user = await db.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      return NextResponse.redirect(new URL("/login?error=invalid-token", req.url));
    }

    if (user.emailVerificationTokenExp && user.emailVerificationTokenExp < new Date()) {
      return NextResponse.redirect(new URL("/login?error=token-expired", req.url));
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExp: null,
      },
    });

    return NextResponse.redirect(new URL("/dashboard?verified=1", req.url));
  } catch (err) {
    console.error("[verify-email]", err);
    return NextResponse.redirect(new URL("/login?error=server-error", req.url));
  }
}
