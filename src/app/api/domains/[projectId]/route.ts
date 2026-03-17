// GET    /api/domains/[projectId] — get domain config for a project
// DELETE /api/domains/[projectId] — remove domain config
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db as prisma } from "@/lib/db/index";

export async function GET(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({
    where:   { id: params.projectId, ownerId: session.user.id },
    include: { domainConfig: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ config: project.domainConfig ?? null });
}

export async function DELETE(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({ where: { id: params.projectId, ownerId: session.user.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.domainConfig.deleteMany({ where: { projectId: params.projectId } });
  await prisma.project.update({ where: { id: params.projectId }, data: { customDomain: null } });

  return NextResponse.json({ ok: true });
}
