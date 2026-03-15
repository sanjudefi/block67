// GET    /api/projects/[id]  — get single project
// PATCH  /api/projects/[id]  — update project (name, paramValues, status)
// DELETE /api/projects/[id]  — delete project
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db as prisma } from "@/lib/db/index";

async function getOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    include: { deployments: { orderBy: { createdAt: "desc" } } },
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
  const { name, paramValues, status } = body;

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(paramValues ? { paramValues } : {}),
      ...(status ? { status } : {}),
    },
  });

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
