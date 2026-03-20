"use client";
// AppShell — sidebar + page content layout used by dashboard/templates/settings pages

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Layers, Plus, Settings, Shield, Users,
  CheckSquare, LogOut, ChevronDown,
} from "lucide-react";
import Image from "next/image";

interface User {
  name?: string | null;
  email?: string | null;
  role?: string;
}

const NAV_MAIN = [
  { href: "/dashboard",    label: "Dashboard",   icon: LayoutDashboard },
  { href: "/templates",    label: "Templates",   icon: Layers },
  { href: "/projects/new", label: "New Project", icon: Plus },
  { href: "/settings",     label: "Settings",    icon: Settings },
];

const NAV_ADMIN = [
  { href: "/admin/templates", label: "Template Queue", icon: CheckSquare },
  { href: "/admin/users",     label: "Users",          icon: Users },
];

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="w-64 h-screen fixed left-0 top-0 bg-gray-900 border-r border-gray-800 flex flex-col z-20">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center">
            <Image src="/block_67-logo.png" alt="Block67" width={100} height={28} className="invert" />
          </Link>
          {user.role === "ADMIN" && (
            <span className="ml-auto text-[10px] text-indigo-400 bg-indigo-950 border border-indigo-800 px-1.5 py-0.5 rounded font-medium">
              admin
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_MAIN.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-indigo-600/20 text-indigo-400 font-medium"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}

          {user.role === "ADMIN" && (
            <>
              <div className="pt-4 pb-1 px-3">
                <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Admin</span>
              </div>
              {NAV_ADMIN.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-indigo-600/20 text-indigo-400 font-medium"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-600/50 flex items-center justify-center text-sm font-bold text-indigo-400">
              {(user.name ?? user.email ?? "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{user.name ?? "User"}</p>
              <p className="text-xs text-gray-500 truncate">{user.email ?? ""}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors w-full"
          >
            <LogOut className="w-3 h-3" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 ml-64 min-h-screen">{children}</main>
    </div>
  );
}
