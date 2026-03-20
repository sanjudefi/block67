// Admin layout — ADMIN role guard + minimal responsive nav
export const dynamic = "force-dynamic";

import { cookies }  from "next/headers";
import { getToken } from "next-auth/jwt";
import { redirect } from "next/navigation";
import Link         from "next/link";
import Image        from "next/image";

const NAV = [
  { href: "/admin/users",    label: "Users"    },
  { href: "/admin/plans",    label: "Plans"    },
  { href: "/admin/leads",    label: "Leads"    },
  { href: "/admin/feedback", label: "Feedback" },
];

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

  if (role !== "ADMIN") redirect("/admin-login");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top nav bar */}
      <header className="sticky top-0 z-40 bg-gray-900 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image src="/block_67-logo.jpg" alt="Block67" width={90} height={25} className="invert" />
            <span className="text-gray-600 text-sm hidden sm:block">/</span>
            <span className="text-gray-400 text-sm hidden sm:block">Admin</span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                {n.label}
              </Link>
            ))}
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="ml-2 px-3 py-1.5 text-xs text-gray-500 hover:text-red-400 hover:bg-red-950 rounded-lg transition-colors border border-gray-800"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
