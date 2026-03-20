// POST /api/feedback — submit feedback
// GET  /api/feedback  — admin: list all feedback
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { notifyAdminFeedback } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, rating } = await req.json();
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
    }

    const feedback = await db.feedback.create({
      data: {
        name:    name.trim(),
        email:   email.trim().toLowerCase(),
        message: message.trim(),
        rating:  rating ? Number(rating) : null,
      },
    });

    // Notify admin (fire-and-forget)
    notifyAdminFeedback(feedback.id, name.trim(), email.trim(), message.trim(), rating ?? null).catch(console.error);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[feedback POST]", err);
    return NextResponse.json({ error: "Failed to submit feedback." }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  // Admin only
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const items = await db.feedback.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}
