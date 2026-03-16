import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // ── Admin guard ────────────────────────────────────────────────────────
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // ── Subdomain routing ──────────────────────────────────────────────────
    // pepecoin.block67.app  →  internally rewrite to /site/pepecoin
    // No auth required for subdomain pages (public-facing project pages)
    const host        = req.headers.get("host") ?? "";
    const appDomain   = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "block67.app";

    if (host.endsWith(`.${appDomain}`)) {
      const slug = host.replace(`.${appDomain}`, "");
      if (slug && slug !== "www") {
        // Rewrite to the public /site/[slug] route
        const rewriteUrl = new URL(`/site/${slug}`, req.url);
        return NextResponse.rewrite(rewriteUrl);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        const host = req.headers.get("host") ?? "";
        const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "block67.app";

        // All subdomain requests are public — bypass auth check
        if (host.endsWith(`.${appDomain}`)) return true;

        // These paths are always public
        const publicPaths = [
          "/",
          "/login",
          "/signup",
          "/templates",
          "/site/",        // public project pages
          "/api/auth",
          "/api/chains",
          "/api/projects/slugs", // slug availability check (unauthenticated)
        ];
        const isPublic = publicPaths.some((p) => pathname.startsWith(p));
        return isPublic || !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
