// GET /api/auth/nonce?address=0x...
// Issues a short-lived challenge nonce for MetaMask signature verification.
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Valid Ethereum address required." }, { status: 400 });
  }

  const nonce = `Sign in to block67.app\n\nNonce: ${randomBytes(16).toString("hex")}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db.authNonce.upsert({
    where:  { address: address.toLowerCase() },
    create: { address: address.toLowerCase(), nonce, expiresAt },
    update: { nonce, expiresAt },
  });

  return NextResponse.json({ nonce });
}
