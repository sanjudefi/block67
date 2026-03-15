"use client";
// PageLayout — top nav layout for non-builder pages (home, templates, settings)
// Light theme, clean top bar

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Zap } from "lucide-react";

interface User {
  name?: string | null;
  email?: string | null;
  role?: string;
}

export function PageLayout({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();

  const initials = (user.name ?? user.email ?? "U")[0].toUpperCase();

  const NAV = [
    { href: "/dashboard", label: "My Projects" },
    { href: "/templates", label: "Templates" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg,#ffffff 0%,#f4f2ff 55%,#ece8ff 100%)" }}>
      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <nav className="h-12 bg-white/80 backdrop-blur-md border-b border-gray-200/70 flex items-center px-6 gap-6 fixed top-0 left-0 right-0 z-30">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">
            block<span className="text-indigo-600">67</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                pathname === href
                  ? "text-gray-900 bg-gray-100 font-medium"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex-1" />

        {/* User avatar + sign out */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 hidden sm:block">
            {user.email ?? user.name ?? ""}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white text-sm font-bold transition-colors"
            title="Sign out"
          >
            {initials}
          </button>
        </div>
      </nav>

      {/* ── Page content (below fixed nav) ──────────────────────────────── */}
      <main className="pt-12">{children}</main>
    </div>
  );
}
