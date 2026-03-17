// GET /api/projects/[id]/dapp-users
// Returns the list of end-user wallets that have connected to this project's public dApp.
// Only accessible by the project owner.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }         from "next-auth";
import { authOptions }              from "@/lib/auth/config";
import { db as prisma }             from "@/lib/db/index";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({
    where: { id: params.id, ownerId: session.user.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const users = await prisma.dAppUser.findMany({
    where:   { projectId: params.id },
    orderBy: { lastSeenAt: "desc" },
    select:  { id: true, walletAddress: true, firstSeenAt: true, lastSeenAt: true },
  });

  return NextResponse.json({ users, total: users.length });
}
