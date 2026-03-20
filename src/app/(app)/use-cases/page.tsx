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

// ── Custom Web3 Solutions ──────────────────────────────────────────────────────
const CUSTOM_SOLUTIONS = [
  {
    id: "DEX",
    icon: "💱",
    title: "Decentralized Exchange (DEX)",
    tagline: "Launch your own token swap platform",
    like: "Like Uniswap",
    features: ["Token swaps", "Liquidity pools", "Fee earnings", "Price charts"],
    gradient: "from-blue-600 to-cyan-500",
  },
  {
    id: "NFT_MARKETPLACE",
    icon: "🖼️",
    title: "NFT Marketplace",
    tagline: "Build your own OpenSea-like platform",
    like: "Like OpenSea",
    features: ["Mint, list & trade NFTs", "Creator royalties", "User dashboards", "Buy/sell flows"],
    gradient: "from-pink-600 to-rose-500",
  },
  {
    id: "DEFI_LENDING",
    icon: "🏦",
    title: "Lending & Borrowing Platform",
    tagline: "Create a DeFi lending platform",
    like: "Like Aave",
    features: ["Supply & borrow", "Dynamic interest rates", "Collateral system", "Risk management"],
    gradient: "from-emerald-600 to-teal-500",
  },
  {
    id: "GAME_ECONOMY",
    icon: "🎮",
    title: "Web3 Game Economy",
    tagline: "Token + NFT based game system",
    like: "Play-to-earn",
    features: ["In-game currency", "NFT assets", "Rewards system", "Player marketplace"],
    gradient: "from-purple-600 to-violet-500",
  },
  {
    id: "RWA",
    icon: "🏢",
    title: "Real World Asset Tokenization",
    tagline: "Tokenize real estate or assets",
    like: "RWA / DeFi",
    features: ["Fractional ownership", "Compliance-ready structure", "Investor dashboard", "On-chain KYC"],
    gradient: "from-amber-600 to-orange-500",
  },
];

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

  const isCustom = cat === "CUSTOM";

  const templateCats = [
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
      <div className="bg-[#0f1117] min-h-screen px-4 pt-12 pb-24">
        <div className="max-w-4xl mx-auto">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="mb-10 pt-2">
            <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-2">Explore</p>
            <h1 className="text-3xl font-bold text-white mb-2">Use Cases</h1>
            <p className="text-gray-400 text-sm">
              Browse ready-to-deploy templates, or contact us to build a fully custom Web3 platform.
            </p>
          </div>

          {/* ── Category tabs (templates + Custom Web3 tab) ───────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            {/* Search — hidden when custom tab active */}
            {!isCustom && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search use cases…"
                  className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 placeholder-gray-600"
                />
              </div>
            )}

            <div className="flex gap-1.5 flex-wrap">
              {/* Template category tabs */}
              {templateCats.map((c) => (
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

              {/* Custom Web3 Solutions tab — special highlighted */}
              <button
                onClick={() => setCat("CUSTOM")}
                className={`text-xs font-bold px-3.5 py-2 rounded-full border transition-all ${
                  isCustom
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-500 text-white shadow-md shadow-indigo-900/40"
                    : "bg-gradient-to-r from-indigo-600/20 to-violet-600/20 border-indigo-500/40 text-indigo-300 hover:from-indigo-600/30 hover:to-violet-600/30 hover:text-white"
                }`}
              >
                ✦ Custom Web3 Solutions
              </button>
            </div>
          </div>

          {/* ── Template grid ─────────────────────────────────────────────── */}
          {!isCustom && (
            filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-600 text-sm">No use cases found for &ldquo;{q}&rdquo;</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {filtered.map((t) => (
                  <Link
                    key={t.id}
                    href={`/use-cases/${t.id}`}
                    className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 flex flex-col cursor-pointer"
                  >
                    <div className={`h-28 bg-gradient-to-br ${t.gradient} flex flex-col items-center justify-center gap-1.5 relative`}>
                      <span className="text-5xl drop-shadow-md group-hover:scale-110 transition-transform duration-200">{t.icon}</span>
                      <p className="font-bold text-white text-sm tracking-wide drop-shadow">{t.name}</p>
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
                        <span className="text-emerald-400 text-[10px] font-bold">⏱ {t.launchMinutes} min{t.launchMinutes !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
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
            )
          )}

          {/* ── Custom Web3 Solutions grid ────────────────────────────────── */}
          {isCustom && (
            <div>
              {/* Section header */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Custom Web3 Solutions</h2>
                <p className="text-gray-400 text-sm max-w-xl">
                  Complex platforms built end-to-end — smart contracts, frontend, backend, and launch strategy. Contact us to get started.
                </p>
                <div className="flex flex-wrap gap-2.5 mt-5">
                  {["🔒 Built with OpenZeppelin", "⛓️ Ethereum compatible", "🚀 Production-ready architecture", "🤝 Dedicated support"].map(b => (
                    <span key={b} className="text-xs bg-white/5 border border-white/10 text-gray-400 px-3 py-1 rounded-full">{b}</span>
                  ))}
                </div>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {CUSTOM_SOLUTIONS.map(sol => (
                  <div
                    key={sol.id}
                    className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 flex flex-col"
                  >
                    {/* Gradient header */}
                    <div className={`h-28 bg-gradient-to-br ${sol.gradient} flex flex-col items-center justify-center gap-1 relative`}>
                      <span className="text-4xl group-hover:scale-110 transition-transform duration-200">{sol.icon}</span>
                      <p className="font-bold text-white text-sm">{sol.title}</p>
                      <span className="absolute top-3 right-3 text-[10px] bg-black/30 text-white/70 px-2 py-0.5 rounded-full backdrop-blur-sm">{sol.like}</span>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex flex-col gap-3 flex-1">
                      <p className="text-xs text-gray-400">{sol.tagline}</p>
                      <div className="space-y-1.5">
                        {sol.features.map(f => (
                          <div key={f} className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />{f}
                          </div>
                        ))}
                      </div>

                      {/* CTA buttons — link to /contact */}
                      <div className="flex gap-2 mt-auto pt-4 border-t border-white/10">
                        <Link
                          href="/contact"
                          className="flex-1 flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-xs font-medium py-2.5 rounded-xl transition-all"
                        >
                          🔧 Custom Build
                        </Link>
                        <Link
                          href="/contact"
                          className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-900/30"
                        >
                          💬 Contact Us
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom CTA */}
              <div className="mt-10 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/20 p-8 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Have a different idea?</h3>
                <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                  We build any Web3 platform from scratch. Tell us your idea and we&apos;ll make it happen.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors shadow-lg shadow-indigo-900/40"
                >
                  🚀 Start a Custom Project
                </Link>
              </div>
            </div>
          )}

          {/* ── Footer promo (only when on templates view) ────────────────── */}
          {!isCustom && (
            <div className="mt-16 rounded-2xl bg-gradient-to-br from-indigo-600/15 to-violet-600/5 border border-indigo-500/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold text-sm">Need something bigger?</p>
                <p className="text-gray-500 text-xs mt-0.5">DEX, NFT Marketplace, DeFi, Game Economy & more — built custom for you.</p>
              </div>
              <button
                onClick={() => setCat("CUSTOM")}
                className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-md"
              >
                ✦ View Custom Web3 Solutions
              </button>
            </div>
          )}

        </div>
      </div>
    </PageLayout>
  );
}
