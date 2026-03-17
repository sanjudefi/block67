// GET /api/domains/status?domain=mytoken.com
// Queries Vercel Domains API for verification status of a given domain.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db as prisma } from "@/lib/db/index";

const VERCEL_API = "https://api.vercel.com";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain) return NextResponse.json({ error: "domain query param required" }, { status: 400 });

  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  const vercelToken     = process.env.VERCEL_TOKEN;

  // ── Vercel status ────────────────────────────────────────────────────────────
  let vercelStatus: {
    verified:      boolean;
    misconfigured: boolean;
    cname:         string;
    verification:  unknown[];
  } = { verified: false, misconfigured: false, cname: "cname.vercel-dns.com", verification: [] };

  if (vercelProjectId && vercelToken) {
    try {
      const res  = await fetch(`${VERCEL_API}/v9/projects/${vercelProjectId}/domains/${encodeURIComponent(domain)}`, {
        headers: { Authorization: `Bearer ${vercelToken}` },
        next:    { revalidate: 0 },
      });
      const data = await res.json() as {
        verified?:      boolean;
        misconfigured?: boolean;
        verification?:  unknown[];
        error?:         { message: string };
      };

      if (res.ok) {
        vercelStatus = {
          verified:      data.verified      ?? false,
          misconfigured: data.misconfigured ?? false,
          cname:         "cname.vercel-dns.com",
          verification:  data.verification  ?? [],
        };
        console.info(`[domains/status] domain=${domain} verified=${vercelStatus.verified}`);

        // If Vercel says verified → mark verified in DB
        if (vercelStatus.verified) {
          await prisma.domainConfig.updateMany({
            where:  { domain },
            data:   { verified: true, verifiedAt: new Date() },
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error("[domains/status] Vercel API error:", e);
    }
  }

  // ── DB record ────────────────────────────────────────────────────────────────
  const dbRecord = await prisma.domainConfig.findFirst({
    where:   { domain },
    include: { project: { select: { slug: true, name: true } } },
  }).catch(() => null);

  return NextResponse.json({
    domain,
    ...vercelStatus,
    dbVerified:  dbRecord?.verified  ?? false,
    verifiedAt:  dbRecord?.verifiedAt ?? null,
    projectSlug: dbRecord?.project?.slug ?? null,
    projectName: dbRecord?.project?.name ?? null,
  });
}
