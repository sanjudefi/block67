"use client";
// Admin — Users management
// Route: /admin/users
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, ExternalLink, Users, Zap, Globe,
  ChevronDown, ChevronRight, Wallet, Mail,
} from "lucide-react";

interface RecentProject {
  id: string; name: string; slug: string; templateId: string;
  status: string; updatedAt: string; deployed: boolean;
  chain: string | null; networkType: string | null; deployedAt: string | null;
}

interface AdminUser {
  id: string; name: string | null; email: string | null;
  walletAddress: string | null; role: string;
  createdAt: string; lastActive: string;
  totalProjects: number; deployedProjects: number;
  recentProjects: RecentProject[];
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

function shortAddr(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }

function NetworkBadge({ type }: { type: string | null }) {
  if (!type) return null;
  return type === "MAINNET"
    ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400 border border-emerald-700/40">Mainnet</span>
    : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/60 text-amber-400 border border-amber-700/40">Testnet</span>;
}

function UserRow({ user }: { user: AdminUser }) {
  const [open, setOpen] = useState(false);
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden transition-all">
      {/* Summary row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-gray-800/50 transition-colors"
      >
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0
          ${isAdmin ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300"}`}>
          {(user.name ?? user.email ?? "?")[0].toUpperCase()}
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm truncate">
              {user.name ?? "Unnamed"}
            </span>
            {isAdmin && (
              <span className="text-[10px] px-1.5 py-0.5 bg-indigo-600/20 text-indigo-400 border border-indigo-700/40 rounded-full">
                Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {user.email && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Mail className="w-3 h-3" />{user.email}
              </span>
            )}
            {user.walletAddress && (
              <span className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                <Wallet className="w-3 h-3" />{shortAddr(user.walletAddress)}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 shrink-0 text-center">
          <div>
            <p className="text-xs text-gray-600">Projects</p>
            <p className="text-sm font-bold text-white">{user.totalProjects}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Deployed</p>
            <p className={`text-sm font-bold ${user.deployedProjects > 0 ? "text-emerald-400" : "text-gray-600"}`}>
              {user.deployedProjects}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Last active</p>
            <p className="text-xs text-gray-400">{timeAgo(user.lastActive)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Joined</p>
            <p className="text-xs text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Chevron */}
        <div className="shrink-0 text-gray-600">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Mobile stats */}
      <div className="sm:hidden px-4 pb-3 flex gap-4 text-center border-t border-gray-800/60">
        <div><p className="text-[10px] text-gray-600">Projects</p><p className="text-sm font-bold text-white">{user.totalProjects}</p></div>
        <div><p className="text-[10px] text-gray-600">Deployed</p><p className={`text-sm font-bold ${user.deployedProjects > 0 ? "text-emerald-400" : "text-gray-600"}`}>{user.deployedProjects}</p></div>
        <div><p className="text-[10px] text-gray-600">Last active</p><p className="text-[11px] text-gray-400">{timeAgo(user.lastActive)}</p></div>
      </div>

      {/* Expanded project list */}
      {open && user.recentProjects.length > 0 && (
        <div className="border-t border-gray-800 px-4 pb-4 pt-3 space-y-2">
          <p className="text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Recent projects</p>
          {user.recentProjects.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-gray-800/50 rounded-xl px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white truncate">{p.name}</span>
                  {p.deployed && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />deployed
                    </span>
                  )}
                  <NetworkBadge type={p.networkType} />
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                  <span className="font-mono text-gray-600">{p.slug}.block67.app</span>
                  {p.chain && <span>· {p.chain}</span>}
                  <span>· {timeAgo(p.updatedAt)}</span>
                </div>
              </div>
              <a
                href={`/site/${p.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-white transition-colors shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
          {user.totalProjects > 5 && (
            <p className="text-xs text-gray-600 text-center pt-1">
              +{user.totalProjects - 5} more projects
            </p>
          )}
        </div>
      )}

      {open && user.recentProjects.length === 0 && (
        <div className="border-t border-gray-800 px-4 py-4 text-sm text-gray-600 text-center">
          No projects yet
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUsers(data.users ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.walletAddress?.toLowerCase().includes(q)
    );
  });

  // Summary stats
  const totalUsers     = users.length;
  const totalProjects  = users.reduce((s, u) => s + u.totalProjects, 0);
  const totalDeployed  = users.reduce((s, u) => s + u.deployedProjects, 0);
  const activeToday    = users.filter((u) => {
    const ms = Date.now() - new Date(u.lastActive).getTime();
    return ms < 86400_000;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">All registered accounts and their activity</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors border border-gray-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users,  label: "Total Users",     value: totalUsers },
          { icon: Zap,    label: "Active Today",     value: activeToday },
          { icon: Globe,  label: "Total Projects",   value: totalProjects },
          { icon: Zap,    label: "Deployed Contracts", value: totalDeployed },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
            <p className="text-xs text-gray-600">{s.label}</p>
            <p className="text-2xl font-bold text-white mt-0.5">{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or wallet…"
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600
                     focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/60 border border-red-800/60 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* User list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-16 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          {search ? "No users match your search" : "No users yet"}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-600">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>
          {filtered.map((u) => <UserRow key={u.id} user={u} />)}
        </div>
      )}
    </div>
  );
}
