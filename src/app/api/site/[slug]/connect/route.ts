/**
 * POST /api/site/[slug]/connect
 *
 * Records an end-user wallet connection for a published dApp.
 * No authentication required — this is a public endpoint called from the
 * public site/[slug] page when a visitor connects their MetaMask wallet.
 *
 * Each project's end-users are stored in block67_dapp_users, namespaced
 * by projectId so each deployed dApp has its own isolated user list.
 */
import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db/index";

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { walletAddress } = (await req.json()) as { walletAddress?: string };

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
    }

    const normalized = walletAddress.toLowerCase().trim();
    if (!/^0x[0-9a-f]{40}$/.test(normalized)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where:  { slug: params.slug },
      select: { id: true, status: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Upsert: create on first connect, update lastSeenAt on subsequent connects
    const dappUser = await prisma.dAppUser.upsert({
      where: {
        projectId_walletAddress: {
          projectId:     project.id,
          walletAddress: normalized,
        },
      },
      create: {
        projectId:     project.id,
        walletAddress: normalized,
      },
      update: {
        lastSeenAt: new Date(),
      },
      select: { id: true, firstSeenAt: true },
    });

    return NextResponse.json({ ok: true, userId: dappUser.id, returning: !!(dappUser.firstSeenAt < new Date(Date.now() - 1000)) });
  } catch (err: unknown) {
    console.error("[site/connect] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
