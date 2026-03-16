// Protected app layout — requires auth, renders children (pages control their own chrome)
export const dynamic = "force-dynamic";

import { cookies }  from "next/headers";
import { getToken } from "next-auth/jwt";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const token = await getToken({
    req: {
      cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])),
      headers: { cookie: cookieStore.toString() },
    } as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) redirect("/login");

  return <>{children}</>;
}
