"use client";
// Admin — Feedback
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Star, MessageSquare, Trash2 } from "lucide-react";

interface FeedbackItem {
  id: string; name: string; email: string; message: string;
  rating: number | null; createdAt: string;
}

function StarRow({ n }: { n: number | null }) {
  if (!n) return <span className="text-gray-600 text-xs">No rating</span>;
  return (
    <span className="text-yellow-400 text-sm">
      {"★".repeat(n)}{"☆".repeat(5 - n)}
    </span>
  );
}

export default function AdminFeedbackPage() {
  const [items,   setItems]   = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/feedback");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setItems(data.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const avgRating = items.filter(i => i.rating).length > 0
    ? (items.filter(i => i.rating).reduce((s, i) => s + (i.rating ?? 0), 0) / items.filter(i => i.rating).length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Feedback</h1>
          <p className="text-sm text-gray-500 mt-0.5">User feedback submissions</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors border border-gray-700">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Feedback", value: items.length },
          { label: "Average Rating", value: avgRating ? `${avgRating} / 5` : "—" },
          { label: "This Month", value: items.filter(i => new Date(i.createdAt) > new Date(Date.now() - 30*86400000)).length },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
            <p className="text-xs text-gray-600">{s.label}</p>
            <p className="text-xl font-bold text-white mt-0.5">{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {error && <div className="bg-red-950/60 border border-red-800/60 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-600 flex flex-col items-center gap-2">
          <MessageSquare className="w-8 h-8 opacity-30" />
          No feedback yet
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="font-semibold text-white text-sm">{item.name}</span>
                  <span className="text-gray-500 text-xs ml-2">{item.email}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StarRow n={item.rating} />
                  <span className="text-xs text-gray-600">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
