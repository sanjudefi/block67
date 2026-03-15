"use client";
// PageLayout — top nav layout for non-builder pages (home, templates, settings)
// Light theme, clean top bar with mobile hamburger menu

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Zap, Menu, X } from "lucide-react";

interface User {
  name?: string | null;
  email?: string | null;
  role?: string;
}

export function PageLayout({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = (user.name ?? user.email ?? "U")[0].toUpperCase();

  const NAV = [
    { href: "/dashboard", label: "My Projects" },
    { href: "/templates", label: "Templates" },
  ];

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg,#ffffff 0%,#f4f2ff 55%,#ece8ff 100%)" }}>
      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <nav className="h-12 bg-white/80 backdrop-blur-md border-b border-gray-200/70 flex items-center px-4 gap-4 fixed top-0 left-0 right-0 z-30">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">
            block<span className="text-indigo-600">67</span>
          </span>
        </Link>

        {/* Nav links — desktop */}
        <div className="hidden sm:flex items-center gap-1">
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

        {/* User email — desktop */}
        <span className="text-xs text-gray-400 hidden md:block">
          {user.email ?? user.name ?? ""}
        </span>

        {/* Avatar / sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white text-sm font-bold transition-colors shrink-0"
          title="Sign out"
        >
          {initials}
        </button>

        {/* Hamburger — mobile only */}
        <button
          className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* ── Mobile dropdown menu ─────────────────────────────────────────── */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="sm:hidden fixed top-12 left-0 right-0 z-20 bg-white border-b border-gray-200 shadow-lg px-4 py-3 flex flex-col gap-1"
        >
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`text-sm px-3 py-2.5 rounded-lg transition-colors ${
                pathname === href
                  ? "text-gray-900 bg-gray-100 font-medium"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-2">
            <p className="text-xs text-gray-400 px-3 mb-1">{user.email ?? user.name ?? ""}</p>
            <button
              onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
              className="w-full text-left text-sm px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* ── Page content (below fixed nav) ──────────────────────────────── */}
      <main className="pt-12">{children}</main>
    </div>
  );
}
