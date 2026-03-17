/**
 * /projects/[slug]/admin — Site management panel
 * Accessible only by the project owner, only for deployed (ACTIVE) projects.
 *
 * Shows:
 *  1. Frontend editor  — change display name, colors, description, links (not contracts)
 *  2. Visitors         — wallets that connected to the live dApp
 *  3. Live site link   — iframe preview + open button
 */
import { redirect, notFound } from "next/navigation";
import { getToken }           from "next-auth/jwt";
import { cookies, headers }   from "next/headers";
import { db as prisma }       from "@/lib/db/index";
import type { NextRequest }   from "next/server";
import { AdminClient }        from "./admin-client";

async function getProject(slug: string, userId: string) {
  return prisma.project.findFirst({
    where:  { slug, ownerId: userId },
    select: {
      id: true, name: true, slug: true, status: true, paramValues: true,
      deployments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          contractAddress: true, txHash: true, deployedAt: true,
          chain: { select: { name: true, explorerUrl: true, chainId: true } },
        },
      },
    },
  });
}

export default async function AdminPage({ params }: { params: { slug: string } }) {
  // Auth — same pattern as other (app) pages
  const token = await getToken({
    req: { headers: Object.fromEntries(headers()), cookies: Object.fromEntries(
      (await cookies()).getAll().map((c) => [c.name, c.value])
    ) } as unknown as NextRequest,
    secret: process.env.NEXTAUTH_SECRET!,
  });

  if (!token?.sub) redirect("/login");

  const project = await getProject(params.slug, token.sub);
  if (!project)                       notFound();
  if (project.status !== "ACTIVE")    redirect(`/projects/${params.slug}`);

  const deploy  = project.deployments[0] ?? null;
  const cfg     = (project.paramValues ?? {}) as Record<string, string>;

  return (
    <AdminClient
      projectId={project.id}
      projectSlug={project.slug}
      projectName={project.name}
      templateKey={cfg._templateKey ?? "erc20-token"}
      config={cfg}
      deployment={deploy ? {
        contractAddress: deploy.contractAddress ?? "",
        chainName:       deploy.chain.name,
        explorerUrl:     deploy.chain.explorerUrl,
        txHash:          deploy.txHash ?? "",
        deployedAt:      deploy.deployedAt?.toISOString() ?? "",
      } : null}
    />
  );
}
