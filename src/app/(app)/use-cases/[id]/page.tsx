"use client";
// Use Case detail page — /use-cases/[id]
// Shows: demo mockup, description, features, → "Implement this Use Case" button
export const dynamic = "force-dynamic";

import { useParams, useRouter, notFound } from "next/navigation";
import { useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PageLayout } from "@/components/PageLayout";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import {
  ArrowLeft, ArrowRight, Check, Zap, Star, ChevronRight,
} from "lucide-react";

// ── Demo mockup: a visual preview of each template ────────────────────────────

function DemoMockup({ t }: { t: (typeof BUILTIN_TEMPLATES)[0] }) {
  const accent = t.accentColor;
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
      style={{ background: "#0a0a0f", minHeight: 340 }}>
      {/* Fake browser chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10"
        style={{ background: "rgba(255,255,255,0.04)" }}>
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
        {/* Hero */}
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

        {/* CTA buttons mock */}
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

        {/* Stats row mock */}
        <div className="grid grid-cols-3 gap-3">
          {[
            t.id === "nft-collection" ? ["10,000", "Max Supply"] :
            t.id === "dao-governance" ? ["1,247", "Members"] :
            t.id === "staking-dashboard" ? ["24.5%", "APY"] :
            ["1B", "Total Supply"],
            t.id === "nft-collection" ? ["0.05 ETH", "Mint Price"] :
            t.id === "dao-governance" ? ["42", "Proposals"] :
            t.id === "staking-dashboard" ? ["$2.4M", "Staked"] :
            ["100K+", "Holders"],
            t.id === "nft-collection" ? ["7.5%", "Royalties"] :
            t.id === "dao-governance" ? ["78%", "Turnout"] :
            t.id === "staking-dashboard" ? ["30 days", "Lock Period"] :
            ["$0.024", "Price"],
          ].map(([val, lbl], i) => (
            <div key={i} className="rounded-xl p-3 text-center border border-white/8"
              style={{ background: "rgba(255,255,255,0.03)" }}>
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
  const t = BUILTIN_TEMPLATES.find(x => x.id === params.id);
  if (!t) { notFound(); return null; }

  const [selectedPrompt, setSelectedPrompt] = useState(t.suggestedPrompts[0] ?? "");

  function implement() {
    const encoded = encodeURIComponent(selectedPrompt);
    router.push(`/projects/new?template=${t.id}&prompt=${encoded}`);
  }

  return (
    <PageLayout user={session?.user ?? {}}>
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/dashboard" className="hover:text-gray-700 transition-colors">Dashboard</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 font-medium">{t.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">

          {/* Left: Info */}
          <div>
            {/* Template header */}
            <div className={`inline-flex items-center gap-3 bg-gradient-to-br ${t.gradient} p-4 rounded-2xl mb-5 shadow-lg`}>
              <span className="text-5xl">{t.icon}</span>
              <div>
                <h1 className="text-2xl font-bold text-white">{t.name}</h1>
                <p className="text-white/70 text-sm">{t.tagline}</p>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed mb-6">{t.description}</p>

            {/* Features */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">What you get</h3>
              <div className="space-y-2">
                {t.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: t.accentColor + "22" }}>
                      <Check className="w-3 h-3" style={{ color: t.accentColor }} />
                    </div>
                    <span className="text-sm text-gray-700">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chain badge */}
            <div className="flex items-center gap-2 mb-8">
              <span className="text-xs text-gray-400">Chains:</span>
              <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">{t.chain}</span>
            </div>

            {/* Suggested starting prompt */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-5 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-500" /> Start with a prompt
              </h3>
              <div className="space-y-2 mb-3">
                {t.suggestedPrompts.slice(0, 4).map((p, i) => (
                  <button key={i} onClick={() => setSelectedPrompt(p)}
                    className={`w-full text-left text-sm px-3.5 py-2.5 rounded-xl border transition-all ${
                      selectedPrompt === p
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-medium"
                        : "border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/50"
                    }`}>
                    {selectedPrompt === p && <Star className="inline w-3 h-3 mr-1.5 text-indigo-400" />}
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button onClick={implement}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${t.accentColor}, ${t.accentColor}bb)` }}>
              <Zap className="w-5 h-5" />
              Implement this Use Case
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">
              Smart contract + live dApp generated instantly · No code required
            </p>
          </div>

          {/* Right: Demo mockup */}
          <div className="lg:sticky lg:top-8">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Live Preview</p>
            <DemoMockup t={t} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 text-center">
                <p className="text-xs font-bold text-indigo-700">~2 minutes</p>
                <p className="text-[10px] text-indigo-500">to deploy</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-center">
                <p className="text-xs font-bold text-emerald-700">Free subdomain</p>
                <p className="text-[10px] text-emerald-500">yourproject.block67.app</p>
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
