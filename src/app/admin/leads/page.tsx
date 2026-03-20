"use client";
// Admin — Custom Build Leads
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Zap, Mail } from "lucide-react";

interface LeadItem {
  id: string; name: string; email: string; projectType: string;
  description: string; budget: string | null; timeline: string | null;
  status: string; createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  NEW:       "bg-indigo-600/20 text-indigo-400 border-indigo-700/40",
  CONTACTED: "bg-yellow-900/40 text-yellow-400 border-yellow-700/40",
  CLOSED:    "bg-emerald-900/40 text-emerald-400 border-emerald-700/40",
};

const TYPE_ICONS: Record<string, string> = {
  DEX:            "💱",
  NFT_MARKETPLACE:"🖼️",
  DEFI_LENDING:   "🏦",
  GAME_ECONOMY:   "🎮",
  RWA:            "🏢",
  OTHER:          "⚡",
};

export default function AdminLeadsPage() {
  const [items,   setItems]   = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/leads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setItems(data.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const newCount = items.filter(i => i.status === "NEW").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Custom Build Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">Inquiries from the Custom Web3 Solutions section</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors border border-gray-700">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Leads",   value: items.length },
          { label: "New",           value: newCount },
          { label: "This Month",    value: items.filter(i => new Date(i.createdAt) > new Date(Date.now() - 30*86400000)).length },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
            <p className="text-xs text-gray-600">{s.label}</p>
            <p className="text-xl font-bold text-white mt-0.5">{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {error && <div className="bg-red-950/60 border border-red-800/60 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-36 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-600 flex flex-col items-center gap-2">
          <Zap className="w-8 h-8 opacity-30" />
          No leads yet
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{TYPE_ICONS[item.projectType] ?? "⚡"}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{item.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[item.status] ?? STATUS_COLORS.NEW}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <Mail className="w-3 h-3" />
                      <a href={`mailto:${item.email}`} className="hover:text-white transition-colors">{item.email}</a>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-indigo-400 font-bold">{item.projectType.replace(/_/g, " ")}</p>
                  <p className="text-xs text-gray-600">{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed mb-3">{item.description}</p>
              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                {item.budget   && <span>💰 Budget: <span className="text-gray-300">{item.budget}</span></span>}
                {item.timeline && <span>⏱ Timeline: <span className="text-gray-300">{item.timeline}</span></span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
