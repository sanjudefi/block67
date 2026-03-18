// Admin layout — ADMIN role guard (middleware already ensures auth)
export const dynamic = "force-dynamic";

import { cookies }    from "next/headers";
import { getToken }   from "next-auth/jwt";
import { redirect }   from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let role: string | null = null;
  try {
    const store = cookies();
    const token = await getToken({
      req:    { cookies: Object.fromEntries(store.getAll().map((c) => [c.name, c.value])) } as never,
      secret: process.env.NEXTAUTH_SECRET,
    });
    role = (token?.role as string) ?? null;
  } catch { /* treat as non-admin */ }

  if (role !== "ADMIN") redirect("/admin/login");

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <AppSidebar user={{}} />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
