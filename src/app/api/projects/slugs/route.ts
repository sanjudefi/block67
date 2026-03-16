// GET /api/projects/slugs?slug=pepecoin&excludeId=clx...
// Public endpoint — no auth required.
// Returns { available: boolean, suggestion?: string }
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db/index";

// Slugs reserved for platform routes
const RESERVED = new Set([
  "www", "app", "api", "admin", "dashboard", "login", "signup",
  "templates", "settings", "site", "blog", "docs", "help", "support",
  "status", "block67", "mail", "cdn",
]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{6,}[a-z0-9]$/; // 8+ chars, starts/ends alphanumeric

export async function GET(req: NextRequest) {
  const slug      = req.nextUrl.searchParams.get("slug")?.toLowerCase().trim() ?? "";
  const excludeId = req.nextUrl.searchParams.get("excludeId") ?? "";

  if (!slug) {
    return NextResponse.json({ available: false, error: "slug is required" }, { status: 400 });
  }

  // Format validation
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({
      available: false,
      error: slug.length < 8
        ? "Subdomain must be at least 8 characters"
        : "Only lowercase letters, numbers and hyphens allowed. Cannot start or end with a hyphen.",
    });
  }

  if (RESERVED.has(slug)) {
    return NextResponse.json({ available: false, error: "This subdomain is reserved" });
  }

  // Database check
  const existing = await prisma.project.findUnique({ where: { slug } });
  const taken    = existing && existing.id !== excludeId;

  if (taken) {
    // Generate a suggestion by appending a short random suffix
    const suffix     = Math.floor(Math.random() * 900 + 100); // 3-digit
    const suggestion = `${slug}-${suffix}`;
    return NextResponse.json({ available: false, suggestion });
  }

  return NextResponse.json({ available: true });
}
