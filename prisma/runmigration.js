// prisma/runmigration.js
// Run from Mac terminal: node prisma/runmigration.js
// Requires: npm install pg (or: npx -y pg)

const { Client } = require("pg");

const DATABASE_URL =
  "postgres://afe2555c99ef7234e1a74622e2bd641b06fcf1c5acc91cb73f4f103792b71a9b:sk_mSKRs8Wd3YztyoPzRAEw9@db.prisma.io:5432/postgres?sslmode=require";

const MIGRATIONS = [
  {
    label: "Add emailVerified to block67_users",
    sql: `ALTER TABLE block67_users ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false`,
  },
  {
    label: "Add emailVerificationToken to block67_users",
    sql: `ALTER TABLE block67_users ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT`,
  },
  {
    label: "Add emailVerificationTokenExp to block67_users",
    sql: `ALTER TABLE block67_users ADD COLUMN IF NOT EXISTS "emailVerificationTokenExp" TIMESTAMP(3)`,
  },
  {
    label: "Add unique index on emailVerificationToken",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "block67_users_emailVerificationToken_key" ON block67_users("emailVerificationToken")`,
  },
  {
    label: "Create block67_feedback table",
    sql: `CREATE TABLE IF NOT EXISTS block67_feedback (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL,
      message     TEXT NOT NULL,
      rating      INTEGER,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: "Create block67_leads table",
    sql: `CREATE TABLE IF NOT EXISTS block67_leads (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL,
      "projectType" TEXT NOT NULL,
      description   TEXT NOT NULL,
      budget        TEXT,
      timeline      TEXT,
      status        TEXT NOT NULL DEFAULT 'NEW',
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
];

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });

  console.log("Connecting to database...");
  await client.connect();
  console.log("Connected!\n");

  let passed = 0;
  let failed = 0;

  for (const { label, sql } of MIGRATIONS) {
    try {
      await client.query(sql);
      console.log(`✓  ${label}`);
      passed++;
    } catch (err) {
      const msg = err.message || String(err);
      if (msg.includes("already exists") || msg.includes("duplicate column")) {
        console.log(`⚠  ${label} — already exists, skipped`);
        passed++;
      } else {
        console.error(`✗  ${label}`);
        console.error(`   ${msg}`);
        failed++;
      }
    }
  }

  await client.end();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("Migration complete! Your database is ready.");
  } else {
    console.log("Some steps failed — check errors above.");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
