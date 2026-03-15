// Protected app layout — requires auth, renders children (pages control their own chrome)
export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // NEXTAUTH_SECRET or DB not configured — send to login
  }
  if (!session) redirect("/login");

  return <>{children}</>;
}
