// POST /api/leads — submit custom build inquiry
// GET  /api/leads   — admin: list all leads
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { notifyAdminLead } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { name, email, projectType, description, budget, timeline } = await req.json();
    if (!name?.trim() || !email?.trim() || !projectType?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "Name, email, project type, and description are required." }, { status: 400 });
    }

    const lead = await db.lead.create({
      data: {
        name:        name.trim(),
        email:       email.trim().toLowerCase(),
        projectType: projectType.trim(),
        description: description.trim(),
        budget:      budget?.trim() || null,
        timeline:    timeline?.trim() || null,
      },
    });

    notifyAdminLead({
      name: lead.name, email: lead.email,
      projectType: lead.projectType, description: lead.description,
      budget: lead.budget, timeline: lead.timeline,
    }).catch(console.error);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[leads POST]", err);
    return NextResponse.json({ error: "Failed to submit inquiry." }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const items = await db.lead.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}
