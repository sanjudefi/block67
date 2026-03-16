// Protected app layout — requires auth, renders children (pages control their own chrome)
export const dynamic = "force-dynamic";

import { headers }   from "next/headers";
import { NextRequest } from "next/server";
import { getToken }  from "next-auth/jwt";
import { redirect }  from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Use getToken (JWT-only, no DB) — same method as middleware, so both
  // always agree on auth state and we never get an infinite redirect loop.
  const token = await getToken({
    req:    new NextRequest("http://n", { headers: headers() }),
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) redirect("/login");

  return <>{children}</>;
}
