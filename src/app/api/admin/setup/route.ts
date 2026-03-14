export const dynamic = "force-dynamic";

// POST /api/admin/setup
// One-time endpoint to bootstrap the first admin account.
// Requires the ADMIN_PASSWORD env var as an authorization key.
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email, password, adminSetupKey } = await req.json();

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD env var not set." }, { status: 500 });
  }

  if (adminSetupKey !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid setup key." }, { status: 403 });
  }

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "Valid email and password (8+ chars) required." }, { status: 400 });
  }

  // Block if any admin already exists
  const adminExists = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (adminExists) {
    return NextResponse.json(
      { error: "An admin account already exists. Use /admin/users to manage roles." },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);
  const admin = await db.user.create({
    data: { email, password: hashed, role: "ADMIN", name: "Admin" },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json({ message: "Admin created successfully.", admin }, { status: 201 });
}
