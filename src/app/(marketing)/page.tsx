"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowUp, Shield, Code2, Zap, Download, Globe, Lock, ChevronRight } from "lucide-react";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";

// ── Category filter labels ─────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  TOKEN:        "Tokens",
  NFT:          "NFTs",
  DAO:          "DAO",
  DEFI:         "DeFi",
  LANDING_PAGE: "Gated",
  OTHER:        "Games & Growth",
};

// ── Rotating placeholder prompts ──────────────────────────────────────────────
const ROTATING_PROMPTS = [
  "Launch a meme coin with 1B supply and 2% buy/sell tax…",
  "Deploy an NFT collection with 10,000 items and 0.05 ETH mint…",
  "Create a DAO governance token with on-chain voting and treasury…",
  "Build a staking platform with 18% APY and flexible lock periods…",
  "Launch a tokenized real estate fund with ERC-20 shares…",
  "Create a play-to-earn gaming token with burn mechanics…",
  "Deploy a DeFi yield farm with auto-compound rewards…",
  "Build a multi-sig treasury with 3-of-5 signers…",
];

// ── Feature cards ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Shield,
    title: "Audited & Secure",
    body: "Every contract is built on OpenZeppelin v5 — the gold standard used by Uniswap, Aave and Compound.",
    accent: "emerald",
  },
  {
    icon: Code2,
    title: "Online Compiler",
    body: "Real solc compiler. Compile any contract to ABI + bytecode instantly — no installs, no CLI.",
    accent: "indigo",
  },
  {
    icon: Download,
    title: "Download Source",
    body: "Get the full Solidity source, ABI, bytecode and Hardhat deploy script as a ready-to-use zip.",
    accent: "violet",
  },
  {
    icon: Zap,
    title: "One-Click Deploy",
    body: "Connect MetaMask and deploy to Ethereum, Base, Polygon or any EVM chain in seconds.",
    accent: "amber",
  },
  {
    icon: Lock,
    title: "Upgradeable Proxies",
    body: "Full UUPS, Transparent and Beacon proxy support. Upgrade contracts without redeploying.",
    accent: "rose",
  },
  {
    icon: Globe,
    title: "Instant Frontend",
    body: "A Web3 frontend with wallet connect ships automatically. Free subdomain on every project.",
    accent: "sky",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Describe your project", body: "Tell us what you want — token, NFT, DAO, or DeFi. Plain English, no prior experience needed." },
  { step: "02", title: "Contracts generated",   body: "Block67 generates audited, production-grade Solidity contracts built on OpenZeppelin v5." },
  { step: "03", title: "Compile & inspect",     body: "Use the built-in online Solidity compiler to get your ABI and bytecode instantly." },
  { step: "04", title: "Deploy to blockchain",  body: "Connect MetaMask and deploy to any EVM chain. Your app goes live with a free subdomain." },
];

const ACCENT: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  indigo:  "bg-indigo-50  text-indigo-600  border-indigo-100",
  violet:  "bg-violet-50  text-violet-600  border-violet-100",
  amber:   "bg-amber-50   text-amber-600   border-amber-100",
  rose:    "bg-rose-50    text-rose-600    border-rose-100",
  sky:     "bg-sky-50     text-sky-600     border-sky-100",
};

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt]                 = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [visible, setVisible]               = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Rotate placeholder text
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPlaceholderIdx((i) => (i + 1) % ROTATING_PROMPTS.length);
        setVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [prompt]);

  const handleSubmit = (p?: string, templateId?: string) => {
    const text = (p ?? prompt).trim();
    if (!text) return;
    if (session) {
      // Logged in → go straight to project creation
      const q = new URLSearchParams({ prompt: text });
      if (templateId) q.set("template", templateId);
      router.push(`/projects/new?${q.toString()}`);
    } else {
      // Not logged in → signup page carries the prompt through
      router.push(`/signup?prompt=${encodeURIComponent(text)}`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">

      {/* ════════════════════════════════════════════════════════════════════
          HERO — gradient background, big prompt box
      ════════════════════════════════════════════════════════════════════ */}
      <section
        className="flex flex-col items-center justify-center px-4 pt-24 pb-10 text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #eef2ff 0%, #e0e7ff 30%, #f0f9ff 60%, #f8fafc 100%)",
        }}
      >
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #a5b4fc22 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 w-full max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-white/80 border border-indigo-200 px-4 py-1.5 rounded-full mb-7 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            OpenZeppelin v5 · Audited Contracts · Solidity 0.8.20
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-bold text-gray-900 tracking-tight leading-[1.08] mb-5">
            Launch your Web3<br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Project in Minutes
            </span>
          </h1>

          <p className="text-lg text-gray-500 max-w-lg mx-auto leading-relaxed mb-10">
            Describe what you want to launch. Block67 generates audited smart contracts,
            compiles them, and deploys to blockchain — no coding required.
          </p>

          {/* ── Big prompt box ────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-[0_4px_40px_rgba(99,102,241,0.15)] border border-indigo-100 focus-within:border-indigo-300 focus-within:shadow-[0_4px_48px_rgba(99,102,241,0.22)] transition-all duration-200 relative">
            {/* Animated placeholder overlay */}
            {!prompt && (
              <div
                className="absolute top-5 left-5 right-14 text-gray-400 text-base leading-relaxed pointer-events-none select-none transition-opacity duration-300"
                style={{ opacity: visible ? 1 : 0 }}
              >
                {ROTATING_PROMPTS[placeholderIdx]}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={1}
              placeholder=""
              aria-label="Describe the Web3 project you want to build"
              className="w-full bg-transparent text-gray-900 text-base px-5 pt-5 pb-14 rounded-2xl outline-none resize-none overflow-hidden"
            />

            {/* Bottom bar */}
            <div className="absolute bottom-3 left-5 right-3 flex items-center justify-between">
              <span className="text-xs text-gray-300 hidden sm:block">
                Tokens · NFTs · DAOs · DeFi · Staking · Multi-sig
              </span>
              <button
                onClick={() => handleSubmit()}
                disabled={!prompt.trim()}
                aria-label="Launch project"
                className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shadow-md hover:shadow-indigo-300"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Not sure label */}
          <p className="mt-8 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.12em]">
            Or choose a use case to get started
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          USE-CASE TEMPLATE GRID — all templates, interactive
      ════════════════════════════════════════════════════════════════════ */}
      <section id="usecases" className="bg-[#0f1117] px-4 pt-10 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Pick a use case and launch in minutes
            </h2>
            <p className="text-gray-400 text-sm">
              Smart contract · Frontend · Deployment — everything ready to go.
            </p>
          </div>

          {/* Category filter bar */}
          {(() => {
            const cats: { key: string; label: string; count: number }[] = [
              { key: "ALL", label: "All", count: BUILTIN_TEMPLATES.length },
              ...Object.entries(
                BUILTIN_TEMPLATES.reduce((acc, t) => {
                  acc[t.category] = (acc[t.category] ?? 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([k, n]) => ({ key: k, label: CATEGORY_LABELS[k] ?? k, count: n })),
            ];
            return (
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {cats.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setCategoryFilter(c.key)}
                    className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                      categoryFilter === c.key
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/40"
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {c.label} <span className="opacity-60 ml-0.5">({c.count})</span>
                  </button>
                ))}
              </div>
            );
          })()}

          {/* 2-column template grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {BUILTIN_TEMPLATES
              .filter((t) => categoryFilter === "ALL" || t.category === categoryFilter)
              .map((t) => (
              <div
                key={t.id}
                className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 flex flex-col"
              >
                {/* Header — tall gradient with big centered icon */}
                <div className={`h-28 bg-gradient-to-br ${t.gradient} flex flex-col items-center justify-center gap-1.5 relative`}>
                  <span className="text-5xl drop-shadow-md">{t.icon}</span>
                  <p className="font-bold text-white text-sm tracking-wide drop-shadow">{t.name}</p>
                  {/* Launch time badge — top-right */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
                    <span className="text-emerald-400 text-[10px] font-bold">⏱ {t.launchMinutes} min{t.launchMinutes !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <p className="text-sm text-gray-300 leading-relaxed">{t.tagline}</p>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{t.description}</p>

                  {/* Feature tags */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {t.features.slice(0, 4).map((f) => (
                      <span key={f} className="text-[10px] bg-white/8 text-gray-400 border border-white/10 rounded-full px-2.5 py-0.5">
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Launch row */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                    <span className="text-[11px] text-gray-500">{t.chain.split(" / ")[0]}</span>
                    <button
                      onClick={() => handleSubmit(t.suggestedPrompts[0], t.id)}
                      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-900/30"
                    >
                      🚀 Launch now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA below grid */}
          <div className="mt-12 text-center">
            <button
              onClick={() => session ? router.push("/projects/new") : router.push("/signup")}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-900/40"
            >
              {session ? "Open Builder →" : "Start Building Free →"}
            </button>
            <p className="mt-3 text-xs text-gray-500">
              {session ? "Your projects are waiting" : "Free to start · No credit card required"}
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FEATURES GRID
      ════════════════════════════════════════════════════════════════════ */}
      <section id="features" className="bg-gray-50 border-y border-gray-100 px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Secure. Compiled. Deployed.
            </h2>
            <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
              Every contract Block67 generates is audited-grade, compiled with real solc,
              and downloadable — ready for production.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-4 ${ACCENT[f.accent]}`}>
                  <f.icon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════════ */}
      <section id="howitworks" className="px-4 py-20 max-w-4xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">How it works</h2>
          <p className="text-gray-500 max-w-sm mx-auto text-sm">
            Block67 handles the hard parts — you focus on launching.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.step} className="relative flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {s.step}
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-300 hidden lg:block" />
                )}
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1.5">{s.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          CTA FOOTER BAND
      ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-indigo-600 to-violet-700 px-4 py-16 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Ready to launch your Web3 project?
          </h2>
          <p className="text-indigo-200 text-sm mb-8 leading-relaxed">
            Join founders shipping secure, audited crypto projects on Block67. Free to start — no credit card required.
          </p>
          <button
            onClick={() => router.push(session ? "/projects/new" : "/signup")}
            className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold text-sm px-8 py-3.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
          >
            {session ? "Open Builder" : "Start Building Free"} <ArrowUp className="w-4 h-4 rotate-90" />
          </button>
          <div className="mt-7 flex items-center justify-center gap-5 text-indigo-300 text-xs">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />Audited contracts</span>
            <span>·</span>
            <span className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5" />Online compiler</span>
            <span>·</span>
            <span className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Downloadable source</span>
          </div>
        </div>
      </section>

    </div>
  );
}
