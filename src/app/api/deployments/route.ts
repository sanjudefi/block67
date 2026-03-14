export const dynamic = "force-dynamic";

// POST /api/deployments — record a new deployment (called after MetaMask signs)
// GET  /api/deployments — list deployments for a project
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  // TODO: validate body, create Deployment record, return deployment id
  return NextResponse.json({ message: "TODO" }, { status: 501 });
}

export async function GET(_req: NextRequest) {
  // TODO: return deployments filtered by projectId query param
  return NextResponse.json({ message: "TODO" }, { status: 501 });
}
