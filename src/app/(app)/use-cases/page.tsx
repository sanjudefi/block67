"use client";
// Use Cases marketplace — /use-cases
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/PageLayout";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import { Search, X, Loader2, CheckCircle2, ArrowRight } from "lucide-react";

// ── Custom Web3 Solutions cards ───────────────────────────────────────────────

const CUSTOM_SOLUTIONS = [
  {
    id: "DEX",
    icon: "💱",
    title: "Decentralized Exchange (DEX)",
    tagline: "Launch your own token swap platform",
    features: ["Token swaps", "Liquidity pools", "Fee earnings"],
    demoLabel: "View Demo",
    gradient: "from-blue-600 to-cyan-500",
  },
  {
    id: "NFT_MARKETPLACE",
    icon: "🖼️",
    title: "NFT Marketplace",
    tagline: "Build your own OpenSea-like platform",
    features: ["Mint, list, trade NFTs", "Creator royalties", "User dashboards"],
    demoLabel: "View Demo",
    gradient: "from-pink-600 to-rose-500",
  },
  {
    id: "DEFI_LENDING",
    icon: "🏦",
    title: "Lending & Borrowing Platform",
    tagline: "Create a DeFi lending platform",
    features: ["Supply & borrow", "Interest rates", "Collateral system"],
    demoLabel: "View Demo",
    gradient: "from-emerald-600 to-teal-500",
  },
  {
    id: "GAME_ECONOMY",
    icon: "🎮",
    title: "Web3 Game Economy",
    tagline: "Token + NFT based game system",
    features: ["In-game currency", "NFT assets", "Rewards system"],
    demoLabel: "View Demo",
    gradient: "from-purple-600 to-violet-500",
  },
  {
    id: "RWA",
    icon: "🏢",
    title: "Real World Asset Tokenization",
    tagline: "Tokenize real estate or assets",
    features: ["Fractional ownership", "Compliance-ready structure", "Investor dashboard"],
    demoLabel: "View Demo",
    gradient: "from-amber-600 to-orange-500",
  },
];

// ── Lead capture form modal ────────────────────────────────────────────────────
function LeadModal({ solution, onClose }: { solution: typeof CUSTOM_SOLUTIONS[0]; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", description: "", budget: "", timeline: "" });
  const [status, setStatus] = useState<"idle"|"loading"|"done"|"error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, projectType: solution.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setStatus("done");
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#12141e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${solution.gradient} p-5 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{solution.icon}</span>
            <div>
              <h2 className="text-white font-bold">{solution.title}</h2>
              <p className="text-white/70 text-xs">{solution.tagline}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === "done" ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg mb-2">Request Received!</h3>
            <p className="text-gray-400 text-sm">We'll reach out to you at <strong className="text-white">{form.email}</strong> within 24 hours to discuss your project.</p>
            <button onClick={onClose} className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-3">
            {status === "error" && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{errMsg}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  placeholder="Your name"
                  className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/60 placeholder-gray-600" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/60 placeholder-gray-600" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">What do you want to build? *</label>
              <textarea required value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                rows={3} placeholder="Describe your project idea, goals, and any specific requirements…"
                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/60 placeholder-gray-600 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Budget (optional)</label>
                <input value={form.budget} onChange={e => setForm(f => ({...f, budget: e.target.value}))}
                  placeholder="e.g. $5k–$20k"
                  className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/60 placeholder-gray-600" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Timeline (optional)</label>
                <input value={form.timeline} onChange={e => setForm(f => ({...f, timeline: e.target.value}))}
                  placeholder="e.g. 2 months"
                  className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/60 placeholder-gray-600" />
              </div>
            </div>
            <button type="submit" disabled={status === "loading"}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors">
              {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {status === "loading" ? "Sending…" : "Request Custom Build"}
            </button>
            <p className="text-center text-xs text-gray-600">We'll get back to you within 24 hours</p>
          </form>
        )}
      </div>
    </div>
  );
}

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
  const [activeLead, setActiveLead] = useState<typeof CUSTOM_SOLUTIONS[0] | null>(null);

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

        {/* ── Custom Web3 Solutions ──────────────────────────────────────── */}
        <div className="mt-20">
          <div className="mb-8">
            <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-2">Enterprise</p>
            <h2 className="text-2xl font-bold text-white mb-2">Custom Web3 Solutions</h2>
            <p className="text-gray-400 text-sm max-w-xl">
              Complex platforms that go beyond templates. Our team builds end-to-end — smart contracts, frontend, backend, and launch strategy.
            </p>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { icon: "🔒", text: "Built with OpenZeppelin" },
              { icon: "⛓️", text: "Ethereum compatible" },
              { icon: "🚀", text: "Production-ready architecture" },
              { icon: "🤝", text: "Dedicated support" },
            ].map(t => (
              <div key={t.text} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 text-xs text-gray-300">
                <span>{t.icon}</span> {t.text}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CUSTOM_SOLUTIONS.map(sol => (
              <div key={sol.id} className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 flex flex-col">
                {/* Gradient header */}
                <div className={`h-24 bg-gradient-to-br ${sol.gradient} flex items-center justify-center gap-3`}>
                  <span className="text-4xl">{sol.icon}</span>
                  <div>
                    <p className="font-bold text-white text-sm">{sol.title}</p>
                    <p className="text-white/70 text-xs">{sol.tagline}</p>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div className="space-y-1.5">
                    {sol.features.map(f => (
                      <div key={f} className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />{f}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-auto pt-3 border-t border-white/10">
                    <button
                      onClick={() => setActiveLead(sol)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-xs font-medium py-2.5 rounded-xl transition-all"
                    >
                      👁️ View Demo
                    </button>
                    <button
                      onClick={() => setActiveLead(sol)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-900/30"
                    >
                      🤝 Request Build
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lead capture modal */}
      {activeLead && <LeadModal solution={activeLead} onClose={() => setActiveLead(null)} />}
    </PageLayout>
  );
}
