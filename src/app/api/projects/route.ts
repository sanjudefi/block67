export const dynamic = "force-dynamic";

// POST /api/projects — create a new project
// GET  /api/projects — list projects for authenticated user
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  // TODO: create Project, mint subdomain slug
  return NextResponse.json({ message: "TODO" }, { status: 501 });
}

export async function GET(_req: NextRequest) {
  return NextResponse.json({ message: "TODO" }, { status: 501 });
}
