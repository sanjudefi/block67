// PATCH /api/user/profile — update name / email for the current user
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, walletAddress: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { name?: string; email?: string };
  const { name, email } = body;

  if (email) {
    const existing = await db.user.findFirst({
      where: { email, NOT: { id: session.user.id } },
    });
    if (existing) return NextResponse.json({ error: "Email already in use." }, { status: 409 });
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(name  !== undefined ? { name:  name.trim()  || null } : {}),
      ...(email !== undefined ? { email: email.trim() || null } : {}),
    },
    select: { id: true, name: true, email: true, walletAddress: true, role: true },
  });

  return NextResponse.json({ user });
}
