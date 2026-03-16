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
