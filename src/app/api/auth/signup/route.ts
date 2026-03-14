export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

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
    const user = await db.user.create({
      data: { name: name?.trim() || null, email, password: hashed },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    // Surface DB setup errors clearly instead of hiding them
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
