export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendVerificationEmail, notifyAdminNewUser } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await db.user.create({
      data: {
        name: name?.trim() || null,
        email,
        password: hashed,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExp: tokenExp,
      },
      select: { id: true, email: true, name: true },
    });

    // Send emails (fire-and-forget — don't block the signup response)
    sendVerificationEmail(email, name?.trim() || null, verificationToken).catch(console.error);
    notifyAdminNewUser(email, null, name?.trim() || null).catch(console.error);

    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("relation") || msg.includes("does not exist") || msg.includes("table")) {
      return NextResponse.json(
        { error: "Database tables not found. Run: npx prisma db push" },
        { status: 503 }
      );
    }
    if (msg.includes("connect") || msg.includes("ECONNREFUSED")) {
      return NextResponse.json(
        { error: "Cannot connect to database. Check DATABASE_URL in Vercel settings." },
        { status: 503 }
      );
    }

    console.error("[signup]", msg);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
