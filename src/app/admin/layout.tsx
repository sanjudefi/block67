// Admin layout — server-side role guard + sidebar
export const dynamic = "force-dynamic";

import { cookies }    from "next/headers";
import { getToken }   from "next-auth/jwt";
import { redirect }   from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const token = await getToken({
    req: {
      cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])),
      headers: { cookie: cookieStore.toString() },
    } as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token)                  redirect("/login");
  if (token.role !== "ADMIN")  redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <AppSidebar user={{ name: token.name as string, email: token.email as string, role: token.role as string }} />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
