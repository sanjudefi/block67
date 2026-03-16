// Server Component — fetches project from DB and passes it to the builder UI
export const dynamic = "force-dynamic";

import { Suspense }           from "react";
import { headers }            from "next/headers";
import { NextRequest }        from "next/server";
import { getToken }           from "next-auth/jwt";
import { db }                 from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import BuilderClient          from "./builder-client";

export default async function BuilderPage({ params }: { params: { slug: string } }) {
  const token = await getToken({
    req:    new NextRequest("http://n", { headers: headers() }),
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.sub) {
    redirect(`/login?callbackUrl=/projects/${encodeURIComponent(params.slug)}`);
  }

  const project = await db.project.findFirst({
    where:   { slug: params.slug, ownerId: token.sub },
    include: { deployments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!project) notFound();

  // Normalise Prisma JSON → plain object expected by the builder
  const initialProject = {
    id:          project.id,
    name:        project.name,
    slug:        project.slug,
    status:      project.status,
    paramValues: (project.paramValues ?? {}) as Record<string, string>,
  };

  return (
    <Suspense>
      <BuilderClient params={params} initialProject={initialProject} />
    </Suspense>
  );
}
