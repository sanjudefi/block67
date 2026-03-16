// POST /api/deployments — save a completed deployment (called from builder after MetaMask deploy)
// GET  /api/deployments?projectId=xxx — list deployments for a project
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }         from "next-auth";
import { authOptions }              from "@/lib/auth/config";
import { db as prisma }             from "@/lib/db/index";

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    projectId:       string;
    evmChainId:      number;   // EVM chain ID (11155111 = Sepolia, 1 = Mainnet, …)
    contractAddress: string;
    txHash?:         string;
    deployerAddress: string;
    constructorArgs?: Record<string, string>;
    contractAbi?:    unknown[];
    gasUsed?:        string;
  };

  const { projectId, evmChainId, contractAddress, txHash, deployerAddress,
          constructorArgs, contractAbi, gasUsed } = body;

  if (!projectId || !evmChainId || !contractAddress || !deployerAddress) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify the project belongs to the current user
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: session.user.id },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Look up the Chain record by EVM chainId
  const chain = await prisma.chain.findUnique({ where: { chainId: evmChainId } });
  if (!chain) {
    return NextResponse.json({ error: `Unknown chain ID: ${evmChainId}` }, { status: 400 });
  }

  const deployment = await (prisma.deployment.create as Function)({
    data: {
      projectId,
      chainId:         chain.id,
      status:          "SUCCESS",
      contractAddress,
      txHash:          txHash ?? null,
      deployerAddress,
      constructorArgs: constructorArgs ?? {},
      contractAbi:     contractAbi ?? null,
      gasUsed:         gasUsed ?? null,
      deployedAt:      new Date(),
    },
  });

  // Mark the project as ACTIVE now that it has a live deployment
  await prisma.project.update({
    where: { id: projectId },
    data:  { status: "ACTIVE" },
  });

  return NextResponse.json({ deployment }, { status: 201 });
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: session.user.id },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const deployments = await prisma.deployment.findMany({
    where:   { projectId },
    include: { chain: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ deployments });
}
