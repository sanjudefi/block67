// GET /api/chains — list active supported chains
import { NextResponse } from "next/server";

export async function GET() {
  // TODO: return all Chain records where isActive = true
  return NextResponse.json({ message: "TODO" }, { status: 501 });
}
