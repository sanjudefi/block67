// GET    /api/projects/[id]  — get single project
// PATCH  /api/projects/[id]  — update project (name, paramValues, status)
// DELETE /api/projects/[id]  — delete project
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth/config";
import { db as prisma } from "@/lib/db/index";

async function getOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
  });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await getOwnedProject(params.id, session.user.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ project });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await getOwnedProject(params.id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, paramValues, status, slug } = body;

  // If slug update requested — validate and check uniqueness
  if (slug !== undefined) {
    const SLUG_RE = /^[a-z0-9][a-z0-9-]{6,}[a-z0-9]$/;
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Invalid slug format. Minimum 8 characters, lowercase alphanumeric and hyphens only." }, { status: 400 });
    }
    const conflict = await prisma.project.findFirst({ where: { slug, NOT: { id: params.id } } });
    if (conflict) {
      return NextResponse.json({ error: "Subdomain already taken" }, { status: 409 });
    }
  }

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(name            ? { name: name.trim() }  : {}),
      ...(paramValues     ? { paramValues }         : {}),
      ...(status          ? { status }              : {}),
      ...(slug !== undefined ? { slug }             : {}),
    },
  });

  // Purge any cached version of the public site page so the live URL
  // immediately shows the new data on next request (Vercel CDN + Next cache).
  revalidatePath(`/site/${updated.slug}`);

  return NextResponse.json({ project: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await getOwnedProject(params.id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete related deployments first
  await prisma.deployment.deleteMany({ where: { projectId: params.id } });
  await prisma.project.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
