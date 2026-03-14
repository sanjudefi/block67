export const dynamic = "force-dynamic";

// POST /api/domains — initiate custom domain verification
// GET  /api/domains/:projectId — check verification status
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  // TODO: create DomainConfig, generate TXT record token
  return NextResponse.json({ message: "TODO" }, { status: 501 });
}
