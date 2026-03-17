// POST /api/domains — connect a custom domain to a project
// GET  /api/domains — list all domain configs for current user
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db as prisma } from "@/lib/db/index";
import { randomBytes } from "crypto";

const PRO_DOMAIN_LIMIT = 6;

async function getUserPlan(userId: string) {
  const record = await prisma.authNonce.findUnique({ where: { address: `upgrade:${userId}` } });
  const isPro   = record && new Date(record.expiresAt) > new Date();
  let domainLimit = isPro ? PRO_DOMAIN_LIMIT : 0;
  try {
    const slug    = isPro ? "premium" : "free";
    const dbPlan  = await prisma.plan.findUnique({ where: { slug } });
    if (dbPlan) domainLimit = dbPlan.domainLimit;
  } catch { /* use default */ }
  return { isPro: !!isPro, domainLimit };
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { ownerId: session.user.id },
    select: { id: true, domainConfig: true, name: true, slug: true },
  });

  const domains = projects
    .filter(p => p.domainConfig)
    .map(p => ({ ...p.domainConfig, projectName: p.name, projectSlug: p.slug }));

  return NextResponse.json({ domains });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { isPro, domainLimit } = await getUserPlan(session.user.id);
  if (!isPro || domainLimit === 0) {
    return NextResponse.json({ error: "Upgrade to Premium to connect custom domains", upgrade: true }, { status: 403 });
  }

  const body = await req.json() as { projectId: string; domain: string };
  const { projectId, domain } = body;
  if (!projectId || !domain) return NextResponse.json({ error: "projectId and domain required" }, { status: 400 });

  // Verify project ownership
  const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: session.user.id } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Check domain limit
  const usedDomains = await prisma.domainConfig.count({
    where: { project: { ownerId: session.user.id } },
  });
  if (usedDomains >= domainLimit) {
    return NextResponse.json({ error: `Domain limit reached (${domainLimit} domains on Premium)` }, { status: 403 });
  }

  // Normalise domain
  const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Create or update domain config
  const txtRecord = "block67-verify-" + randomBytes(8).toString("hex");
  const config = await prisma.domainConfig.upsert({
    where:  { projectId },
    update: { domain: cleanDomain, verified: false, txtRecord },
    create: { projectId, domain: cleanDomain, txtRecord },
  });

  // Also update project.customDomain
  await prisma.project.update({ where: { id: projectId }, data: { customDomain: cleanDomain } });

  return NextResponse.json({ config }, { status: 201 });
}
