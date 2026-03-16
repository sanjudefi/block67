// Server Component — fetches project from DB and passes it to the builder UI
export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth/config";
import { db }               from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import BuilderClient        from "./builder-client";

export default async function BuilderPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/projects/${encodeURIComponent(params.slug)}`);
  }

  const project = await db.project.findFirst({
    where:   { slug: params.slug, ownerId: session.user.id },
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

  return <BuilderClient params={params} initialProject={initialProject} />;
}
