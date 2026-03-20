// POST /api/admin/migrate — run schema migrations
// Auth: either ADMIN session OR { secret: NEXTAUTH_SECRET } in body
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  // Accept either a valid admin session OR the NEXTAUTH_SECRET passed as "secret"
  const body = await req.json().catch(() => ({}));
  const session = await getServerSession(authOptions);
  const isAdminSession = session?.user?.role === "ADMIN";
  const isSecretAuth =
    body?.secret &&
    process.env.NEXTAUTH_SECRET &&
    body.secret === process.env.NEXTAUTH_SECRET;

  if (!isAdminSession && !isSecretAuth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  type StepResult = { step: string; ok: boolean; error?: string };
  const results: StepResult[] = [];

  async function trySQL(step: string, sql: string) {
    try {
      await db.$executeRawUnsafe(sql);
      results.push({ step, ok: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists") || msg.includes("duplicate column")) {
        results.push({ step: `${step} (already exists — skipped)`, ok: true });
      } else {
        results.push({ step, ok: false, error: msg });
      }
    }
  }

  // ── User table: add new columns ───────────────────────────────────────────
  await trySQL(
    "Add emailVerified to block67_users",
    `ALTER TABLE block67_users ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false`
  );
  await trySQL(
    "Add emailVerificationToken to block67_users",
    `ALTER TABLE block67_users ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT UNIQUE`
  );
  await trySQL(
    "Add emailVerificationTokenExp to block67_users",
    `ALTER TABLE block67_users ADD COLUMN IF NOT EXISTS "emailVerificationTokenExp" TIMESTAMP(3)`
  );

  // ── Feedback table ────────────────────────────────────────────────────────
  await trySQL(
    "Create block67_feedback table",
    `CREATE TABLE IF NOT EXISTS block67_feedback (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      email     TEXT NOT NULL,
      message   TEXT NOT NULL,
      rating    INTEGER,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  // ── Leads table ───────────────────────────────────────────────────────────
  await trySQL(
    "Create block67_leads table",
    `CREATE TABLE IF NOT EXISTS block67_leads (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL,
      "projectType" TEXT NOT NULL,
      description   TEXT NOT NULL,
      budget        TEXT,
      timeline      TEXT,
      status        TEXT NOT NULL DEFAULT 'NEW',
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  const failed = results.filter(r => !r.ok);
  return NextResponse.json({
    ok:      failed.length === 0,
    results,
    message: failed.length === 0
      ? "All migrations applied successfully!"
      : `${results.filter(r => r.ok).length} succeeded, ${failed.length} failed`,
  });
}
