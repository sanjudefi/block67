// POST /api/admin/migrate — run schema migrations (admin only)
// Creates new tables: block67_feedback, block67_leads
// Adds new columns: block67_users.emailVerified, emailVerificationToken, emailVerificationTokenExp
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: string[] = [];
  const errors: string[] = [];

  async function trySQL(label: string, sql: string) {
    try {
      await db.$executeRawUnsafe(sql);
      results.push(`✓ ${label}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // "already exists" errors are fine — means migration already applied
      if (msg.includes("already exists") || msg.includes("duplicate column")) {
        results.push(`⚠ ${label} (already exists — skipped)`);
      } else {
        errors.push(`✗ ${label}: ${msg}`);
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

  return NextResponse.json({
    ok: errors.length === 0,
    results,
    errors,
    message: errors.length === 0
      ? "All migrations applied successfully!"
      : `${results.length} succeeded, ${errors.length} failed`,
  });
}
