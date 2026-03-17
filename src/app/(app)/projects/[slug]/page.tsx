// Server Component — fetches project from DB and passes it to the builder UI
export const dynamic = "force-dynamic";

import { Suspense }           from "react";
import { cookies }            from "next/headers";
import { getToken }           from "next-auth/jwt";
import { db }                 from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import BuilderClient          from "./builder-client";

export default async function BuilderPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies();
  const token = await getToken({
    req: {
      cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])),
      headers: { cookie: cookieStore.toString() },
    } as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.sub) {
    redirect(`/login?callbackUrl=/projects/${encodeURIComponent(params.slug)}`);
  }

  const project = await db.project.findFirst({
    where: { slug: params.slug, ownerId: token.sub },
  });

  if (!project) notFound();

  // Check if this project already has a successful deployment
  const latestDeploy = await db.deployment.findFirst({
    where:   { projectId: project.id },
    orderBy: { createdAt: "desc" },
    select:  { contractAddress: true, status: true },
  });
  const deployedContractAddress =
    latestDeploy?.contractAddress && latestDeploy.status !== "FAILED"
      ? latestDeploy.contractAddress
      : null;

  const initialProject = {
    id:                      project.id,
    name:                    project.name,
    slug:                    project.slug,
    status:                  project.status,
    paramValues:             (project.paramValues ?? {}) as Record<string, string>,
    deployedContractAddress: deployedContractAddress ?? "",
  };

  return (
    <Suspense>
      <BuilderClient params={params} initialProject={initialProject} />
    </Suspense>
  );
}
