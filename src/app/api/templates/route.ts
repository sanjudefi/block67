// GET  /api/templates — list approved templates (public)
// POST /api/templates — submit a new template (authenticated)
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  // TODO: return approved templates, support ?category= filter
  return NextResponse.json({ message: "TODO" }, { status: 501 });
}

export async function POST(_req: NextRequest) {
  // TODO: create Template with PENDING_REVIEW status
  return NextResponse.json({ message: "TODO" }, { status: 501 });
}
