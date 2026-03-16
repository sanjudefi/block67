// POST /api/user/link-wallet  — link / unlink a MetaMask wallet to the current account
// DELETE /api/user/link-wallet — unlink wallet
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { verifyMessage } from "viem";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { address: string; signature: string; nonce: string };
  const { address, signature, nonce } = body;
  if (!address || !signature || !nonce) {
    return NextResponse.json({ error: "address, signature and nonce are required" }, { status: 400 });
  }

  const lowerAddress = address.toLowerCase();

  // Verify nonce exists and hasn't expired
  const nonceRecord = await db.authNonce.findUnique({ where: { address: lowerAddress } });
  if (!nonceRecord || nonceRecord.nonce !== nonce || nonceRecord.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired nonce." }, { status: 400 });
  }

  // Verify signature
  const valid = await verifyMessage({
    address:   address as `0x${string}`,
    message:   nonce,
    signature: signature as `0x${string}`,
  });
  if (!valid) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  // Consume nonce
  await db.authNonce.delete({ where: { address: lowerAddress } });

  // Check no other account already owns this wallet
  const conflict = await db.user.findFirst({
    where: { walletAddress: lowerAddress, NOT: { id: session.user.id } },
  });
  if (conflict) return NextResponse.json({ error: "This wallet is already linked to another account." }, { status: 409 });

  const user = await db.user.update({
    where: { id: session.user.id },
    data:  { walletAddress: lowerAddress },
    select: { id: true, name: true, email: true, walletAddress: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Don't allow unlinking if it's the only auth method (no password / no email)
  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, password: true, walletAddress: true },
  });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!me.password || !me.email) {
    return NextResponse.json(
      { error: "Add an email and password before unlinking your wallet." },
      { status: 400 },
    );
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data:  { walletAddress: null },
    select: { id: true, name: true, email: true, walletAddress: true },
  });

  return NextResponse.json({ user });
}
