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
// PlanKey intentionally not imported — accept any string plan slug

const FREE_LIMIT         = 3;
const PRO_LIMIT          = 6;
const FREE_DOMAIN_LIMIT  = 0;
const PRO_DOMAIN_LIMIT   = 6;

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const record = await prisma.authNonce.findUnique({
    where: { address: `upgrade:${session.user.id}` },
  });

  const isActive = record && new Date(record.expiresAt) > new Date();

  // Try to get plan config from DB for accurate limits
  let projectLimit = isActive ? PRO_LIMIT       : FREE_LIMIT;
  let domainLimit  = isActive ? PRO_DOMAIN_LIMIT : FREE_DOMAIN_LIMIT;
  let frontendChangesPerDay = isActive ? 50 : 10;
  let contractChangesPerDay = isActive ? 10 : 2;

  try {
    const planSlug = isActive ? "premium" : "free";
    const dbPlan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (dbPlan) {
      projectLimit          = dbPlan.projectLimit;
      domainLimit           = dbPlan.domainLimit;
      frontendChangesPerDay = dbPlan.frontendChangesPerDay;
      contractChangesPerDay = dbPlan.contractChangesPerDay;
    }
  } catch { /* use hardcoded defaults */ }

  return NextResponse.json({
    plan:                  isActive ? "premium" : "free",
    limit:                 projectLimit,
    domainLimit,
    frontendChangesPerDay,
    contractChangesPerDay,
    expiresAt:             record?.expiresAt ?? null,
    txHash:                isActive ? record!.nonce : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { txHash: string; plan: string; walletAddress: string };
  const { txHash, plan, walletAddress } = body;

  if (!txHash || !plan) {
    return NextResponse.json({ error: "txHash and plan required" }, { status: 400 });
  }

  // Determine expiry days: premium/yearly = 365, monthly = 30, enterprise = 30
  let days = 365;
  if (plan === "monthly")    days = 30;
  else if (plan === "yearly") days = 365;

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.authNonce.upsert({
    where:  { address: `upgrade:${session.user.id}` },
    update: { nonce: txHash, expiresAt },
    create: { address: `upgrade:${session.user.id}`, nonce: txHash, expiresAt },
  });

  console.info(`[upgrade] user=${session.user.id} wallet=${walletAddress} plan=${plan} tx=${txHash} expires=${expiresAt.toISOString()}`);

  return NextResponse.json({ ok: true, plan: "premium", limit: PRO_LIMIT, domainLimit: PRO_DOMAIN_LIMIT, expiresAt });
}
