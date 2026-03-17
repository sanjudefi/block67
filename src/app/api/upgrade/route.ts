// POST /api/upgrade — record a paid upgrade (MetaMask payment confirmed)
// GET  /api/upgrade — check current user's plan
//
// Plan data is stored in the AuthNonce table as:
//   address  = "upgrade:{userId}"
//   nonce    = txHash (proof of payment)
//   expiresAt = plan expiry (30 days or 365 days from payment)
// No schema migration needed.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db as prisma } from "@/lib/db/index";
import { PLANS } from "@/lib/upgrade/plans";
import type { PlanKey } from "@/lib/upgrade/plans";

const FREE_LIMIT = 3;
const PRO_LIMIT  = 6;

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const record = await prisma.authNonce.findUnique({
    where: { address: `upgrade:${session.user.id}` },
  });

  const isActive = record && new Date(record.expiresAt) > new Date();
  return NextResponse.json({
    plan:      isActive ? "pro" : "free",
    limit:     isActive ? PRO_LIMIT : FREE_LIMIT,
    expiresAt: record?.expiresAt ?? null,
    txHash:    isActive ? record.nonce : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { txHash: string; plan: PlanKey; walletAddress: string };
  const { txHash, plan, walletAddress } = body;

  if (!txHash || !plan || !PLANS[plan]) {
    return NextResponse.json({ error: "txHash and plan required" }, { status: 400 });
  }

  const days      = PLANS[plan].days;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // Upsert upgrade record in AuthNonce table (creative reuse — no migration needed)
  await prisma.authNonce.upsert({
    where:  { address: `upgrade:${session.user.id}` },
    update: { nonce: txHash, expiresAt },
    create: { address: `upgrade:${session.user.id}`, nonce: txHash, expiresAt },
  });

  console.info(`[upgrade] user=${session.user.id} wallet=${walletAddress} plan=${plan} tx=${txHash} expires=${expiresAt.toISOString()}`);

  return NextResponse.json({ ok: true, plan: "pro", limit: PRO_LIMIT, expiresAt });
}
