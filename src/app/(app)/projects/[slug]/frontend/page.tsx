/**
 * /projects/[slug]/frontend — Frontend Editor
 * Block67 Intelligence AI chat + live iframe preview
 */
import { redirect, notFound } from "next/navigation";
import { getToken }           from "next-auth/jwt";
import { cookies, headers }   from "next/headers";
import { db as prisma }       from "@/lib/db/index";
import type { NextRequest }   from "next/server";
import { FrontendClient }     from "./frontend-client";

async function getProject(slug: string, userId: string) {
  return prisma.project.findFirst({
    where:  { slug, ownerId: userId },
    select: {
      id: true, name: true, slug: true, status: true, paramValues: true,
      deployments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { contractAddress: true },
      },
    },
  });
}

export default async function FrontendPage({ params }: { params: { slug: string } }) {
  const token = await getToken({
    req: { headers: Object.fromEntries(headers()), cookies: Object.fromEntries(
      (await cookies()).getAll().map((c) => [c.name, c.value])
    ) } as unknown as NextRequest,
    secret: process.env.NEXTAUTH_SECRET!,
  });

  if (!token?.sub) redirect("/login");

  const project = await getProject(params.slug, token.sub);
  if (!project) notFound();

  const cfg = (project.paramValues ?? {}) as Record<string, string>;

  // Compute the correct public site URL for this environment.
  // On block67.app production, we use the pretty subdomain.
  // On Vercel previews / localhost, we use /site/[slug] on the same host.
  const host = headers().get("host") ?? "";
  const isProduction = host === "block67.app" || host === "www.block67.app";
  const siteUrl = isProduction
    ? `https://${project.slug}.block67.app`
    : `https://${host}/site/${project.slug}`;

  return (
    <FrontendClient
      projectId={project.id}
      projectSlug={project.slug}
      projectName={project.name}
      templateKey={cfg._templateKey ?? "erc20-token"}
      config={cfg}
      isLive={project.status === "ACTIVE"}
      siteUrl={siteUrl}
    />
  );
}

