"use client";
// Use Case detail page — /use-cases/[id]
export const dynamic = "force-dynamic";

import { useParams, useRouter, notFound } from "next/navigation";
import { useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PageLayout } from "@/components/PageLayout";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import { ArrowLeft, Check, Zap, Star, ArrowRight } from "lucide-react";

// ── Demo mockup ────────────────────────────────────────────────────────────────
function DemoMockup({ t }: { t: (typeof BUILTIN_TEMPLATES)[0] }) {
  const accent = t.accentColor;
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0a0f]" style={{ minHeight: 340 }}>
      {/* Fake browser chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/[0.04]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
        </div>
        <div className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-0.5 mx-8">
          <p className="text-[10px] text-white/30 font-mono text-center">yourproject.block67.app</p>
        </div>
      </div>
      {/* Mock dApp content */}
      <div className="px-8 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
            style={{ background: accent + "22", color: accent, border: `1px solid ${accent}44` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
            Live on Blockchain
          </div>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
            style={{ background: accent + "22", border: `1px solid ${accent}33` }}>
            {t.icon}
          </div>
          <div className="h-6 w-48 rounded-full mx-auto mb-2" style={{ background: accent + "30" }} />
          <div className="h-3 w-64 rounded-full mx-auto mb-1 bg-white/10" />
          <div className="h-3 w-40 rounded-full mx-auto bg-white/6" />
        </div>
        <div className="flex gap-3 justify-center mb-8">
          <div className="px-6 py-2.5 rounded-xl text-xs font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
            {t.id === "nft-collection" ? "Mint NFT" :
             t.id === "dao-governance" ? "Vote Now" :
             t.id === "staking-dashboard" ? "Stake Tokens" :
             "Connect Wallet"}
          </div>
          <div className="px-6 py-2.5 rounded-xl text-xs font-bold border"
            style={{ borderColor: accent + "44", color: accent }}>
            Learn More
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            t.id === "nft-collection" ? ["10,000", "Max Supply"] :
            t.id === "dao-governance" ? ["1,247",  "Members"]    :
            t.id === "staking-dashboard" ? ["24.5%", "APY"]      :
            ["1B", "Total Supply"],
            t.id === "nft-collection" ? ["0.05 ETH", "Mint Price"] :
            t.id === "dao-governance" ? ["42",       "Proposals"]  :
            t.id === "staking-dashboard" ? ["$2.4M", "Staked"]     :
            ["100K+", "Holders"],
            t.id === "nft-collection" ? ["7.5%",    "Royalties"]   :
            t.id === "dao-governance" ? ["78%",     "Turnout"]     :
            t.id === "staking-dashboard" ? ["30 days", "Lock Period"] :
            ["$0.024", "Price"],
          ].map(([val, lbl], i) => (
            <div key={i} className="rounded-xl p-3 text-center border border-white/8 bg-white/[0.03]">
              <p className="text-sm font-bold text-white mb-0.5">{val}</p>
              <p className="text-[10px] text-white/40">{lbl}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
function UseCaseDetail() {
  const params  = useParams<{ id: string }>();
  const router  = useRouter();
  const { data: session } = useSession();
  const tFound = BUILTIN_TEMPLATES.find(x => x.id === params.id);
  if (!tFound) { notFound(); return null; }
  const t = tFound;

  const [selectedPrompt, setSelectedPrompt] = useState(t.suggestedPrompts[0] ?? "");

  function implement() {
    router.push(`/projects/new?template=${t.id}&prompt=${encodeURIComponent(selectedPrompt)}`);
  }

  return (
    <PageLayout user={session?.user ?? {}}>
      <div className="bg-[#0f1117] min-h-screen px-4 py-10">
        <div className="max-w-5xl mx-auto">

          {/* ── Breadcrumb ── */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
            <Link href="/dashboard" className="hover:text-gray-300 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <span>/</span>
            <Link href="/use-cases" className="hover:text-gray-300 transition-colors">Use Cases</Link>
            <span>/</span>
            <span className="text-gray-300 font-medium">{t.name}</span>
          </div>

          {/* ── Hero header ── */}
          <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${t.gradient} p-8 mb-10 shadow-2xl`}>
            <div className="flex items-center gap-6">
              <span className="text-7xl drop-shadow-2xl">{t.icon}</span>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{t.name}</h1>
                  <span className="text-xs bg-black/20 text-white/80 border border-white/20 px-2.5 py-1 rounded-full font-semibold">
                    ⏱ {t.launchMinutes} min{t.launchMinutes !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-white/80 text-base">{t.tagline}</p>
                <p className="text-white/50 text-xs mt-1">{t.chain}</p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-start">

            {/* ── Left: info panel ── */}
            <div>

              {/* Description */}
              <p className="text-gray-300 leading-relaxed mb-8 text-base">{t.description}</p>

              {/* Features */}
              <div className="mb-8">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">What you get</h3>
                <div className="space-y-3">
                  {t.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border"
                        style={{ background: t.accentColor + "22", borderColor: t.accentColor + "44" }}>
                        <Check className="w-3 h-3" style={{ color: t.accentColor }} />
                      </div>
                      <span className="text-sm text-gray-300">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prompt selector */}
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 mb-6">
                <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" /> Start with a prompt
                </h3>
                <div className="space-y-2">
                  {t.suggestedPrompts.slice(0, 4).map((p, i) => (
                    <button key={i} onClick={() => setSelectedPrompt(p)}
                      className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${
                        selectedPrompt === p
                          ? "border-indigo-500/60 bg-indigo-600/20 text-indigo-300 font-medium"
                          : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-gray-300"
                      }`}>
                      {selectedPrompt === p && <Star className="inline w-3 h-3 mr-1.5 text-indigo-400" />}
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button onClick={implement}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base shadow-xl transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${t.accentColor}, ${t.accentColor}bb)` }}>
                <Zap className="w-5 h-5" />
                Implement this Use Case
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-center text-xs text-gray-600 mt-2">
                Smart contract + live dApp generated instantly · No code required
              </p>
            </div>

            {/* ── Right: demo mockup ── */}
            <div className="lg:sticky lg:top-20">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Live Preview</p>
              <DemoMockup t={t} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl px-3 py-3 text-center">
                  <p className="text-sm font-bold text-indigo-300">~{t.launchMinutes} min{t.launchMinutes !== 1 ? "s" : ""}</p>
                  <p className="text-[10px] text-indigo-500 mt-0.5">to deploy</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-3 text-center">
                  <p className="text-sm font-bold text-emerald-300">Free subdomain</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">yourproject.block67.app</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default function UseCasePage() {
  return <Suspense><UseCaseDetail /></Suspense>;
}
