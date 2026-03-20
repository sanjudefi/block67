"use client";
// /contact — Contact us page: Custom Build enquiry + Feedback in one place

import { useState } from "react";
import Link from "next/link";

const PROJECT_TYPES = [
  { value: "DEX",             label: "💱 Decentralized Exchange (DEX)" },
  { value: "NFT_MARKETPLACE", label: "🖼️ NFT Marketplace" },
  { value: "DEFI_LENDING",    label: "🏦 DeFi Lending & Borrowing Platform" },
  { value: "GAME_ECONOMY",    label: "🎮 Web3 Game Economy" },
  { value: "RWA",             label: "🏢 Real World Asset Tokenization" },
  { value: "OTHER",           label: "🔧 Other / Custom idea" },
];

const BUDGETS = [
  "$5k – $15k", "$15k – $50k", "$50k – $150k", "$150k+", "Not sure yet",
];

const TIMELINES = [
  "ASAP (< 1 month)", "1–3 months", "3–6 months", "6+ months", "Flexible",
];

function Star({ filled, onClick }: { filled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-2xl transition-transform hover:scale-110 ${filled ? "text-yellow-400" : "text-gray-600"}`}
    >
      ★
    </button>
  );
}

export default function ContactPage() {
  // ── Enquiry form state ─────────────────────────────────────────────────────
  const [eq, setEq] = useState({
    name: "", email: "", projectType: "", description: "", budget: "", timeline: "",
  });
  const [eqLoading, setEqLoading] = useState(false);
  const [eqDone,    setEqDone]    = useState(false);
  const [eqErr,     setEqErr]     = useState("");

  async function submitEnquiry(e: React.FormEvent) {
    e.preventDefault();
    setEqErr(""); setEqLoading(true);
    const res = await fetch("/api/leads", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(eq),
    });
    const d = await res.json();
    setEqLoading(false);
    if (res.ok) setEqDone(true);
    else setEqErr(d.error ?? "Something went wrong. Try again.");
  }

  // ── Feedback form state ────────────────────────────────────────────────────
  const [fb, setFb] = useState({ name: "", email: "", message: "", rating: 0 });
  const [fbLoading, setFbLoading] = useState(false);
  const [fbDone,    setFbDone]    = useState(false);
  const [fbErr,     setFbErr]     = useState("");

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    setFbErr(""); setFbLoading(true);
    const res = await fetch("/api/feedback", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(fb),
    });
    const d = await res.json();
    setFbLoading(false);
    if (res.ok) setFbDone(true);
    else setFbErr(d.error ?? "Something went wrong. Try again.");
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-12">
        <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-2">Get in touch</p>
        <h1 className="text-4xl font-bold text-white mb-3">Contact Us</h1>
        <p className="text-gray-400 text-base max-w-xl">
          Ready to build your Custom Web3 Solution? Or just want to share feedback?
          Fill in the form below — we&apos;ll get back to you within 24 hours.
        </p>

        {/* Trust pills */}
        <div className="flex flex-wrap gap-2 mt-5">
          {["💬 24h response", "🔒 Built with OpenZeppelin", "⛓️ Ethereum compatible", "🚀 End-to-end delivery"].map(t => (
            <span key={t} className="text-xs bg-white/5 border border-white/10 text-gray-400 px-3 py-1 rounded-full">{t}</span>
          ))}
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 pb-24 grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ── LEFT: Custom Build Enquiry (wider) ────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🤝</span>
              <h2 className="text-lg font-bold text-white">Custom Web3 Solutions</h2>
            </div>
            <p className="text-gray-500 text-xs mb-6">
              DEX, NFT Marketplace, DeFi, Game Economy, RWA — tell us what you&apos;re building.
            </p>

            {eqDone ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-white mb-2">We&apos;ve received your enquiry!</h3>
                <p className="text-gray-400 text-sm">We&apos;ll reach out to <span className="text-indigo-400">{eq.email}</span> within 24 hours.</p>
                <Link href="/use-cases" className="inline-block mt-6 text-xs text-indigo-400 hover:text-indigo-300 underline">
                  ← Browse Use Cases
                </Link>
              </div>
            ) : (
              <form onSubmit={submitEnquiry} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-medium">Your Name *</label>
                    <input
                      required value={eq.name} onChange={e => setEq(p => ({ ...p, name: e.target.value }))}
                      placeholder="Satoshi Nakamoto"
                      className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 placeholder-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-medium">Email Address *</label>
                    <input
                      required type="email" value={eq.email} onChange={e => setEq(p => ({ ...p, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 placeholder-gray-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">Project Type *</label>
                  <select
                    required value={eq.projectType} onChange={e => setEq(p => ({ ...p, projectType: e.target.value }))}
                    className="w-full bg-[#1a1d2e] border border-white/10 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/60 appearance-none"
                  >
                    <option value="" disabled>Select your project type…</option>
                    {PROJECT_TYPES.map(pt => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">Describe your project *</label>
                  <textarea
                    required rows={4} value={eq.description} onChange={e => setEq(p => ({ ...p, description: e.target.value }))}
                    placeholder="Tell us what you want to build, who your users are, and any key features you need…"
                    className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 placeholder-gray-600 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-medium">Budget Range</label>
                    <select
                      value={eq.budget} onChange={e => setEq(p => ({ ...p, budget: e.target.value }))}
                      className="w-full bg-[#1a1d2e] border border-white/10 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/60 appearance-none"
                    >
                      <option value="">Select budget…</option>
                      {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-medium">Timeline</label>
                    <select
                      value={eq.timeline} onChange={e => setEq(p => ({ ...p, timeline: e.target.value }))}
                      className="w-full bg-[#1a1d2e] border border-white/10 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/60 appearance-none"
                    >
                      <option value="">Select timeline…</option>
                      {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {eqErr && (
                  <p className="text-xs text-red-400 bg-red-950/60 border border-red-800/60 rounded-xl px-3 py-2.5">✗ {eqErr}</p>
                )}

                <button
                  type="submit" disabled={eqLoading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-indigo-900/30"
                >
                  {eqLoading ? "Sending…" : "🚀 Submit Enquiry"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── RIGHT: Feedback + contact info ────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Feedback card */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">⭐</span>
              <h2 className="text-base font-bold text-white">Share Feedback</h2>
            </div>
            <p className="text-gray-500 text-xs mb-5">Rate your experience and help us improve.</p>

            {fbDone ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🙏</div>
                <p className="text-white font-semibold text-sm">Thanks for your feedback!</p>
                <p className="text-gray-500 text-xs mt-1">We read every response.</p>
              </div>
            ) : (
              <form onSubmit={submitFeedback} className="space-y-3.5">
                {/* Stars */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} filled={fb.rating >= s} onClick={() => setFb(p => ({ ...p, rating: s }))} />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">Your Name</label>
                  <input
                    value={fb.name} onChange={e => setFb(p => ({ ...p, name: e.target.value }))}
                    placeholder="Name"
                    className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/60 placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">Email *</label>
                  <input
                    required type="email" value={fb.email} onChange={e => setFb(p => ({ ...p, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/60 placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">Message *</label>
                  <textarea
                    required rows={3} value={fb.message} onChange={e => setFb(p => ({ ...p, message: e.target.value }))}
                    placeholder="What do you love? What can we improve?"
                    className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500/60 placeholder-gray-600 resize-none"
                  />
                </div>

                {fbErr && <p className="text-xs text-red-400 bg-red-950/60 border border-red-800/60 rounded-xl px-3 py-2">{fbErr}</p>}

                <button
                  type="submit" disabled={fbLoading}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 disabled:opacity-40 text-white font-semibold text-sm rounded-xl transition-all"
                >
                  {fbLoading ? "Sending…" : "Send Feedback →"}
                </button>
              </form>
            )}
          </div>

          {/* Quick contact info */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Direct contact</h3>
            <div className="flex items-center gap-2.5 text-xs text-gray-400">
              <span className="text-lg">✉️</span>
              <a href="mailto:sanju.m@catchway.com" className="hover:text-white transition-colors">sanju.m@catchway.com</a>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-gray-400">
              <span className="text-lg">🌐</span>
              <Link href="/use-cases" className="hover:text-white transition-colors">Browse all use cases</Link>
            </div>
            <div className="pt-3 border-t border-white/10">
              <p className="text-xs text-gray-600">We typically respond within 24 hours. For urgent enquiries email us directly.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
