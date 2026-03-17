"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/dashboard",     label: "Dashboard",     icon: "▦" },
  { href: "/templates",     label: "Templates",     icon: "⊞" },
  { href: "/projects/new",  label: "New Project",   icon: "+" },
  { href: "/settings",      label: "Settings",      icon: "⚙" },
];

export function AppSidebar({
  user,
}: {
  user: { name?: string | null; email?: string | null; role?: string };
}) {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-gray-900 border-r border-gray-800 flex flex-col z-10">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-800">
        <Link href="/dashboard" className="text-xl font-bold text-white">
          block<span className="text-indigo-500">67</span>
        </Link>
        {user.role === "ADMIN" && (
          <span className="ml-2 text-xs text-indigo-400 bg-indigo-950 border border-indigo-800 px-1.5 py-0.5 rounded">
            admin
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === l.href
                ? "bg-indigo-600/20 text-indigo-400 font-medium"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <span className="text-base">{l.icon}</span>
            {l.label}
          </Link>
        ))}

        {user.role === "ADMIN" && (
          <>
            <div className="pt-3 pb-1 px-3">
              <span className="text-xs text-gray-600 uppercase tracking-wider">Admin</span>
            </div>
            <Link
              href="/admin/templates"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith("/admin/templates")
                  ? "bg-indigo-600/20 text-indigo-400"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <span>✓</span> Template Queue
            </Link>
            <Link
              href="/admin/users"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith("/admin/users")
                  ? "bg-indigo-600/20 text-indigo-400"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <span>👤</span> Users
            </Link>
            <Link
              href="/admin/plans"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith("/admin/plans")
                  ? "bg-indigo-600/20 text-indigo-400"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <span>★</span> Plans
            </Link>
          </>
        )}
      </nav>

      {/* User + sign out */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 truncate mb-2">
          {user.email ?? user.name ?? "Wallet user"}
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}
