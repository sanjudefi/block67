"use client";
// PageLayout — top nav layout for non-builder pages (dashboard, use-cases, settings)

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Zap, Menu, X, Settings, LogOut, User, Plus, AlertTriangle } from "lucide-react";
import { Footer } from "./Footer";

interface UserProps {
  name?: string | null;
  email?: string | null;
  walletAddress?: string | null;
  role?: string;
  emailVerified?: boolean | null;
}

export function PageLayout({ user, children }: { user: UserProps; children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [walletAddr,  setWalletAddr]  = useState(user.walletAddress ?? "");
  const menuRef    = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const initials     = (user.name ?? user.email ?? "U")[0].toUpperCase();
  const displayName  = user.name ?? user.email ?? "User";

  const NAV = [
    { href: "/dashboard",  label: "My Projects" },
    { href: "/use-cases",  label: "Use Cases"   },
  ];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current    && !menuRef.current.contains(e.target as Node))    setMenuOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { setMenuOpen(false); setProfileOpen(false); }, [pathname]);

  async function connectMetaMask() {
    if (typeof window === "undefined" || !window.ethereum) {
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = `https://metamask.app.link/dapp/${window.location.href.replace(/^https?:\/\//, "")}`;
        return;
      }
      alert("MetaMask not installed. Get it at metamask.io");
      return;
    }
    try {
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWalletAddr(accounts[0] ?? "");
    } catch { /* user rejected */ }
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <nav className="h-12 bg-[#0f1117]/95 backdrop-blur-md border-b border-white/10 flex items-center px-4 gap-4 fixed top-0 left-0 right-0 z-30">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white text-sm">
            block<span className="text-indigo-400">67</span>
          </span>
        </Link>

        {/* Nav links — desktop */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  active
                    ? "text-white bg-white/10 font-medium"
                    : "text-gray-400 hover:text-white hover:bg-white/8"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* New Project button */}
        <button
          onClick={() => router.push("/projects/new")}
          className="hidden sm:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors shadow-md shadow-indigo-900/40"
        >
          <Plus className="w-3.5 h-3.5" /> New Project
        </button>

        {/* Avatar — opens profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white text-sm font-bold transition-colors shrink-0"
            title="Profile"
          >
            {initials}
          </button>

          {/* Profile dropdown */}
          {profileOpen && (
            <div className="absolute top-10 right-0 z-50 bg-[#1a1d27] border border-white/10 rounded-2xl shadow-2xl w-64 overflow-hidden">
              {/* User info */}
              <div className="px-4 pt-4 pb-3 bg-indigo-600/10 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                    {user.email && user.name && (
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    )}
                    {!user.name && (
                      <Link
                        href="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="text-xs text-indigo-400 hover:underline"
                      >
                        Add your name →
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* MetaMask wallet */}
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Wallet</p>
                {walletAddr ? (
                  <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2">
                    <span>🦊</span>
                    <span className="text-xs font-mono text-gray-300 flex-1 truncate">
                      {walletAddr.slice(0, 6)}…{walletAddr.slice(-4)}
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-medium">
                      Connected
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={connectMetaMask}
                    className="w-full flex items-center justify-center gap-2 text-sm text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-xl px-3 py-2 transition-colors font-medium"
                  >
                    🦊 Connect MetaMask
                  </button>
                )}
                {!user.email && (
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 mt-2 hover:bg-amber-500/20 transition-colors"
                  >
                    <span>⚠</span> Add email as backup login
                  </Link>
                )}
              </div>

              {/* Actions */}
              <div className="px-2 py-2">
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded-xl transition-colors"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  Profile & Settings
                </Link>
                <button
                  onClick={() => { setProfileOpen(false); signOut({ callbackUrl: "/" }); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hamburger — mobile only */}
        <button
          className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-white/10 transition-colors shrink-0"
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
          className="sm:hidden fixed top-12 left-0 right-0 z-20 bg-[#0f1117] border-b border-white/10 shadow-xl px-4 py-3 flex flex-col gap-1"
        >
          {NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`text-sm px-3 py-2.5 rounded-lg transition-colors ${
                  active
                    ? "text-white bg-white/10 font-medium"
                    : "text-gray-400 hover:text-white hover:bg-white/8"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => { setMenuOpen(false); router.push("/projects/new"); }}
            className="flex items-center gap-2 mt-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
          <div className="border-t border-white/10 mt-2 pt-2">
            <p className="text-xs text-gray-500 px-3 mb-1">{user.email ?? user.name ?? ""}</p>
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" /> Profile & Settings
            </Link>
            <button
              onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
              className="w-full text-left text-sm px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* ── Email verification banner ────────────────────────────────────── */}
      {user.email && user.emailVerified === false && (
        <div className="fixed top-12 left-0 right-0 z-20 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-3 text-xs text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Please verify your email to enable contract deployment. Check your inbox for a link from no-reply@block67.app</span>
        </div>
      )}

      {/* ── Page content (below fixed nav) ──────────────────────────────── */}
      <main className={`pt-12 ${user.email && user.emailVerified === false ? "pt-[68px]" : ""}`}>
        {children}
        <Footer />
      </main>
    </div>
  );
}
