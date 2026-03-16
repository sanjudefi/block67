// Admin layout — server-side role guard + sidebar
export const dynamic = "force-dynamic";

import { headers }    from "next/headers";
import { NextRequest } from "next/server";
import { getToken }   from "next-auth/jwt";
import { redirect }   from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = await getToken({
    req:    new NextRequest("http://n", { headers: headers() }),
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
