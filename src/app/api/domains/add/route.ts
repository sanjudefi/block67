// POST /api/domains/add
// Registers a custom domain with Vercel + saves domain→project mapping to DB.
// Requires: VERCEL_TOKEN and VERCEL_PROJECT_ID env vars.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db as prisma } from "@/lib/db/index";
import { randomBytes } from "crypto";

const VERCEL_API = "https://api.vercel.com";

async function getUserPlan(userId: string) {
  const record = await prisma.authNonce.findUnique({ where: { address: `upgrade:${userId}` } });
  const isPro = record && new Date(record.expiresAt) > new Date();
  let domainLimit = isPro ? 6 : 0;
  try {
    const dbPlan = await prisma.plan.findUnique({ where: { slug: isPro ? "premium" : "free" } });
    if (dbPlan) domainLimit = dbPlan.domainLimit;
  } catch { /* use default */ }
  return { isPro: !!isPro, domainLimit };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Plan check
  const { isPro, domainLimit } = await getUserPlan(session.user.id);
  if (!isPro || domainLimit === 0) {
    return NextResponse.json({ error: "Upgrade to Premium to connect custom domains", upgrade: true }, { status: 403 });
  }

  const body = await req.json() as { domain: string; projectId: string };
  const { domain, projectId } = body;
  if (!domain || !projectId) return NextResponse.json({ error: "domain and projectId required" }, { status: 400 });

  // Verify project ownership
  const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: session.user.id } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Domain limit check
  const usedDomains = await prisma.domainConfig.count({ where: { project: { ownerId: session.user.id } } });
  if (usedDomains >= domainLimit && !(await prisma.domainConfig.findUnique({ where: { projectId } }))) {
    return NextResponse.json({ error: `Domain limit reached (${domainLimit} on Premium)` }, { status: 403 });
  }

  const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/:\d+$/, "");

  // ── 1. Register with Vercel ──────────────────────────────────────────────────
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  const vercelToken     = process.env.VERCEL_TOKEN;

  let vercelVerification: unknown[] = [];
  let vercelError: string | null = null;

  if (vercelProjectId && vercelToken) {
    try {
      const vercelRes = await fetch(`${VERCEL_API}/v9/projects/${vercelProjectId}/domains`, {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: cleanDomain }),
      });
      const vercelData = await vercelRes.json() as { verification?: unknown[]; error?: { message: string } };

      if (!vercelRes.ok && vercelData.error?.message) {
        // Domain already added to this project is OK
        if (!vercelData.error.message.includes("already")) {
          vercelError = vercelData.error.message;
          console.warn(`[domains/add] Vercel API error for ${cleanDomain}:`, vercelError);
        }
      }

      vercelVerification = (vercelData.verification as unknown[] | undefined) ?? [];
      console.info(`[domains/add] Vercel registered domain=${cleanDomain} project=${project.slug}`);
    } catch (e) {
      console.error("[domains/add] Vercel API unreachable:", e);
      vercelError = "Vercel API unreachable — domain saved locally, add it manually in Vercel dashboard";
    }
  } else {
    console.warn("[domains/add] VERCEL_PROJECT_ID or VERCEL_TOKEN not set — skipping Vercel registration");
    vercelError = "VERCEL_TOKEN/VERCEL_PROJECT_ID not configured";
  }

  // ── 2. Save to DB ────────────────────────────────────────────────────────────
  const txtRecord = "block67-verify-" + randomBytes(8).toString("hex");
  const config = await prisma.domainConfig.upsert({
    where:  { projectId },
    update: { domain: cleanDomain, verified: false, txtRecord },
    create: { projectId, domain: cleanDomain, txtRecord },
  });
  await prisma.project.update({ where: { id: projectId }, data: { customDomain: cleanDomain } });

  console.info(`[domains/add] DB saved domain=${cleanDomain} → slug=${project.slug} projectId=${projectId}`);

  return NextResponse.json({
    config,
    projectSlug:       project.slug,
    vercelVerification,
    vercelError,
  }, { status: 201 });
}
