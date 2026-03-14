// GET /api/auth/nonce?address=0x...
// Issues a short-lived challenge nonce for MetaMask signature verification.
export const dynamic = "force-dynamic";

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

  try {
    await db.authNonce.upsert({
      where:  { address: address.toLowerCase() },
      create: { address: address.toLowerCase(), nonce, expiresAt },
      update: { nonce, expiresAt },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("relation") || msg.includes("does not exist")) {
      return NextResponse.json({ error: "Database not set up. Run: npx prisma db push" }, { status: 503 });
    }
    return NextResponse.json({ error: "Database error: " + msg }, { status: 500 });
  }

  return NextResponse.json({ nonce });
}
