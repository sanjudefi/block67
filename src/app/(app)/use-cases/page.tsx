"use client";
// Use Cases marketplace — /use-cases
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/PageLayout";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import { Search } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  TOKEN:        "Tokens",
  NFT:          "NFTs",
  DAO:          "DAO",
  DEFI:         "DeFi",
  LANDING_PAGE: "Gated",
  OTHER:        "Games & Growth",
};

export default function UseCasesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [q,   setQ]   = useState("");
  const [cat, setCat] = useState("ALL");

  const cats = [
    { key: "ALL", label: "All", count: BUILTIN_TEMPLATES.length },
    ...Object.entries(
      BUILTIN_TEMPLATES.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([k, n]) => ({ key: k, label: CATEGORY_LABELS[k] ?? k, count: n })),
  ];

  const filtered = BUILTIN_TEMPLATES.filter((t) =>
    (cat === "ALL" || t.category === cat) &&
    (!q || t.name.toLowerCase().includes(q.toLowerCase()) || t.tagline.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <PageLayout user={session?.user ?? {}}>
      <div className="bg-[#0f1117] min-h-screen px-4 pt-12 pb-20">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-10 pt-2">
            <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-2">Explore</p>
            <h1 className="text-3xl font-bold text-white mb-2">Use Cases</h1>
            <p className="text-gray-400 text-sm">
              Click any use case to see a live demo — smart contract, frontend & deployment included. No code required.
            </p>
          </div>

          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search use cases…"
                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 placeholder-gray-600"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {cats.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCat(c.key)}
                  className={`text-xs font-semibold px-3.5 py-2 rounded-full border transition-all ${
                    cat === c.key
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/40"
                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {c.label} <span className="opacity-60">({c.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-600 text-sm">No use cases found for &ldquo;{q}&rdquo;</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filtered.map((t) => (
                <Link
                  key={t.id}
                  href={`/use-cases/${t.id}`}
                  className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 flex flex-col cursor-pointer"
                >
                  {/* Gradient header */}
                  <div className={`h-28 bg-gradient-to-br ${t.gradient} flex flex-col items-center justify-center gap-1.5 relative`}>
                    <span className="text-5xl drop-shadow-md group-hover:scale-110 transition-transform duration-200">{t.icon}</span>
                    <p className="font-bold text-white text-sm tracking-wide drop-shadow">{t.name}</p>
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
                      <span className="text-emerald-400 text-[10px] font-bold">⏱ {t.launchMinutes} min{t.launchMinutes !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <p className="text-sm text-gray-300 leading-relaxed">{t.tagline}</p>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{t.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {t.features.slice(0, 4).map((f) => (
                        <span key={f} className="text-[10px] bg-white/[0.06] text-gray-400 border border-white/10 rounded-full px-2.5 py-0.5">{f}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                      <span className="text-[11px] text-gray-600">{t.chain.split(" / ")[0]}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-indigo-400 group-hover:text-indigo-300 font-medium transition-colors">View demo →</span>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/projects/new?template=${t.id}&prompt=${encodeURIComponent(t.suggestedPrompts[0])}`); }}
                          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-lg shadow-emerald-900/30"
                        >
                          🚀 Launch
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
