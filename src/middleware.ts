/**
 * Middleware — runs at the Vercel edge on every request.
 *
 * Priority order:
 *  1. Subdomain requests  (*.block67.app)  → rewrite to /site/[slug]   (no auth)
 *  2. Custom domain requests               → rewrite to /site/_domain   (no auth)
 *  3. Public main-domain paths             → pass through               (no auth)
 *  4. Protected main-domain paths          → require valid session token
 *  5. /admin paths                         → require ADMIN role
 */

import { NextResponse }  from "next/server";
import type { NextRequest } from "next/server";
import { getToken }      from "next-auth/jwt";

// ── Constants ──────────────────────────────────────────────────────────────────
const APP_DOMAIN = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? "block67.app").toLowerCase();

/** Paths on the main domain that never require authentication. */
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/site/",           // direct /site/[slug] URLs (e.g. block67.app/site/daogover)
  "/api/auth",        // NextAuth endpoints
  "/api/chains",      // public chain list
  "/api/projects/slugs", // slug availability check
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function classifyHost(host: string): "main" | "subdomain" | "custom" {
  const h = host.toLowerCase().split(":")[0]; // strip port (useful in dev)
  if (h === APP_DOMAIN || h === `www.${APP_DOMAIN}`) return "main";
  if (h.endsWith(`.${APP_DOMAIN}`))                  return "subdomain";
  // localhost / Vercel preview URLs are treated as main domain
  if (h === "localhost" || h.endsWith(".vercel.app")) return "main";
  return "custom";
}

// ── Middleware ─────────────────────────────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const host     = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;
  const kind     = classifyHost(host);

  // ── 1. Subdomain  (daogover.block67.app → /site/daogover) ─────────────────
  if (kind === "subdomain") {
    const rawSlug = host.toLowerCase().split(":")[0].slice(0, -(APP_DOMAIN.length + 1));
    const slug    = rawSlug.replace(/[^a-z0-9-]/g, ""); // sanitise

    if (slug && slug !== "www") {
      const url      = req.nextUrl.clone();
      // Preserve sub-paths: daogover.block67.app/something → /site/daogover/something
      url.pathname   = `/site/${slug}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }
    // Bare *.block67.app with no valid slug — fall through to main logic
  }

  // ── 2. Custom domain  (daogover.com → /site/_domain?domain=daogover.com) ──
  if (kind === "custom") {
    const url = req.nextUrl.clone();
    url.pathname = "/site/_domain";
    url.searchParams.set("domain", host.toLowerCase().split(":")[0]);
    return NextResponse.rewrite(url);
  }

  // ── 3 & 4. Main domain auth guard ─────────────────────────────────────────
  // Home page is always public
  if (pathname === "/") return NextResponse.next();

  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p)
  );
  if (isPublic) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // ── 5. Admin guard ─────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!token || token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ── 6. Authenticated-only routes ──────────────────────────────────────────
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Exclude static assets, images, and common media files
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?)$).*)",
  ],
};
