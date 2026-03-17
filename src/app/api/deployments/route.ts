// POST /api/deployments — save a completed deployment (called from builder after MetaMask deploy)
// GET  /api/deployments?projectId=xxx — list deployments for a project
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }         from "next-auth";
import { authOptions }              from "@/lib/auth/config";
import { db as prisma }             from "@/lib/db/index";

// ── Well-known EVM chains ─────────────────────────────────────────────────────
// If a chain isn't in the DB yet we auto-create it on first deployment so the
// user never gets a "Unknown chain" error. This was the root cause of
// deployments appearing to succeed but never being saved to the dashboard.
const KNOWN_CHAINS: Record<number, {
  name: string; slug: string; rpcUrl: string;
  explorerUrl: string; nativeCurrency: string;
  networkType: "MAINNET" | "TESTNET";
}> = {
  1:        { name: "Ethereum",        slug: "ethereum",      rpcUrl: "https://eth.llamarpc.com",                explorerUrl: "https://etherscan.io",            nativeCurrency: "ETH",   networkType: "MAINNET" },
  11155111: { name: "Sepolia",         slug: "sepolia",       rpcUrl: "https://rpc.sepolia.org",                 explorerUrl: "https://sepolia.etherscan.io",    nativeCurrency: "ETH",   networkType: "TESTNET" },
  137:      { name: "Polygon",         slug: "polygon",       rpcUrl: "https://polygon-rpc.com",                 explorerUrl: "https://polygonscan.com",         nativeCurrency: "MATIC", networkType: "MAINNET" },
  8453:     { name: "Base",            slug: "base",          rpcUrl: "https://mainnet.base.org",                explorerUrl: "https://basescan.org",            nativeCurrency: "ETH",   networkType: "MAINNET" },
  84532:    { name: "Base Sepolia",    slug: "base-sepolia",  rpcUrl: "https://sepolia.base.org",                explorerUrl: "https://sepolia.basescan.org",    nativeCurrency: "ETH",   networkType: "TESTNET" },
  42161:    { name: "Arbitrum One",    slug: "arbitrum",      rpcUrl: "https://arb1.arbitrum.io/rpc",            explorerUrl: "https://arbiscan.io",             nativeCurrency: "ETH",   networkType: "MAINNET" },
  10:       { name: "Optimism",        slug: "optimism",      rpcUrl: "https://mainnet.optimism.io",             explorerUrl: "https://optimistic.etherscan.io", nativeCurrency: "ETH",   networkType: "MAINNET" },
  56:       { name: "BNB Smart Chain", slug: "bsc",           rpcUrl: "https://bsc-dataseed.binance.org",        explorerUrl: "https://bscscan.com",             nativeCurrency: "BNB",   networkType: "MAINNET" },
  43114:    { name: "Avalanche",       slug: "avalanche",     rpcUrl: "https://api.avax.network/ext/bc/C/rpc",   explorerUrl: "https://snowtrace.io",            nativeCurrency: "AVAX",  networkType: "MAINNET" },
  250:      { name: "Fantom",          slug: "fantom",        rpcUrl: "https://rpc.ftm.tools",                   explorerUrl: "https://ftmscan.com",             nativeCurrency: "FTM",   networkType: "MAINNET" },
  80001:    { name: "Polygon Mumbai",  slug: "polygon-mumbai",rpcUrl: "https://rpc-mumbai.maticvigil.com",       explorerUrl: "https://mumbai.polygonscan.com",  nativeCurrency: "MATIC", networkType: "TESTNET" },
};

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    projectId:        string;
    evmChainId:       number;   // EVM chain ID (11155111 = Sepolia, 1 = Mainnet, …)
    contractAddress:  string;
    txHash?:          string;
    deployerAddress:  string;
    constructorArgs?: Record<string, string>;
    contractAbi?:     unknown[];
    gasUsed?:         string;
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

  // ── Look up (or auto-create) the Chain record ─────────────────────────────
  // Previously this returned 400 if the chain wasn't seeded in the DB, causing
  // ALL deployments to fail to save while the error was silently swallowed in
  // the builder → "not deployed" on the public site despite on-chain success.
  let chain = await prisma.chain.findUnique({ where: { chainId: evmChainId } });

  if (!chain) {
    const known = KNOWN_CHAINS[evmChainId];
    if (!known) {
      return NextResponse.json(
        { error: `Chain ID ${evmChainId} is not yet supported. Contact support to add it.` },
        { status: 400 }
      );
    }
    // Upsert to handle concurrent deploys that could race to create the same record
    chain = await prisma.chain.upsert({
      where:  { chainId: evmChainId },
      create: { chainId: evmChainId, isActive: true, ...known },
      update: {}, // already exists — leave it unchanged
    });
  }

  // Store ABI inside constructorArgs as _abi key since the standalone
  // contractAbi column may not exist in the DB yet (migration pending).
  const mergedArgs = {
    ...(constructorArgs ?? {}),
    ...(contractAbi ? { _abi: contractAbi } : {}),
  };

  const deployment = await prisma.deployment.create({
    data: {
      projectId,
      chainId:         chain.id,
      status:          "SUCCESS",
      contractAddress,
      txHash:          txHash ?? null,
      deployerAddress,
      constructorArgs: mergedArgs,
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
    orderBy: { createdAt: "desc" },
    select: {
      id:              true,
      projectId:       true,
      chainId:         true,
      status:          true,
      contractAddress: true,
      txHash:          true,
      deployerAddress: true,
      constructorArgs: true,
      gasUsed:         true,
      errorMessage:    true,
      deployedAt:      true,
      createdAt:       true,
      chain:           true,
      // contractAbi excluded — column not yet in DB (migration pending)
    },
  });

  return NextResponse.json({ deployments });
}
