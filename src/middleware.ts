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
    const host = req.headers.get("host") ?? "";
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "block67.app";

    if (host.endsWith(`.${appDomain}`)) {
      const slug = host.replace(`.${appDomain}`, "");
      if (slug && slug !== "www") {
        return NextResponse.rewrite(new URL(`/projects/${slug}${pathname}`, req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;

        // These paths are always public
        const publicPaths = [
          "/",
          "/login",
          "/signup",
          "/templates",
          "/api/auth",
          "/api/chains",
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
