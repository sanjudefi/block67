"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ── Rotating prompts (founder-voice) ─────────────────────────────────────────
const ROTATING_PROMPTS = [
  "Launch a meme coin called PepeCoin with 1B supply and 2% tax...",
  "Deploy an NFT collection with 10,000 items and 0.05 ETH mint price...",
  "Create a DAO governance token with on-chain voting and treasury...",
  "Build a staking platform with 18% APY and flexible lock periods...",
  "Launch a tokenized real estate fund with ERC-20 shares...",
  "Create a play-to-earn gaming token with burn mechanics...",
  "Deploy a DeFi yield farm with auto-compound rewards...",
  "Build a token-gated community with NFT membership passes...",
];

// ── Launch scenario chips ─────────────────────────────────────────────────────
const LAUNCH_SCENARIOS = [
  { emoji: "🚀", label: "Meme Coin",          prompt: "Launch a meme coin with 1 billion supply, 2% buy/sell tax and staking rewards" },
  { emoji: "🖼",  label: "NFT Collection",     prompt: "Create an ERC-721 NFT collection with 10,000 supply, whitelist minting and royalties" },
  { emoji: "🏛",  label: "DAO Governance",     prompt: "Build a DAO with on-chain voting, proposals, timelock and multi-sig treasury" },
  { emoji: "💰",  label: "Staking Platform",   prompt: "Build a DeFi staking platform with 18% APY, reward distribution and flexible lock periods" },
  { emoji: "📊",  label: "Tokenized Fund",     prompt: "Create a tokenized investment fund with ERC-20 shares and on-chain accounting" },
  { emoji: "🏠",  label: "Real Estate Token",  prompt: "Deploy a tokenized real estate asset with fractional ownership and yield distribution" },
  { emoji: "🎮",  label: "Gaming Token",       prompt: "Create a play-to-earn gaming token with NFT items, burn mechanics and leaderboard rewards" },
  { emoji: "🔐",  label: "Multisig Wallet",    prompt: "Deploy a multi-sig treasury with configurable signers, threshold approvals and spending limits" },
];

// ── How it works steps ────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  { step: "01", title: "Describe your project", body: "Tell us what you want to launch — token, NFT, DAO, or DeFi protocol. Plain English, no code required." },
  { step: "02", title: "AI generates contracts", body: "Block67 generates production-grade Solidity contracts with OpenZeppelin security standards, compiled and verified." },
  { step: "03", title: "Deploy to blockchain", body: "Connect MetaMask and deploy to Ethereum, Base, Polygon or any EVM chain in one click." },
  { step: "04", title: "Launch your app",       body: "Your Web3 frontend goes live instantly with a free subdomain — shareable in seconds." },
];

// ── Why Block67 bullets ───────────────────────────────────────────────────────
const WHY_BULLETS = [
  { icon: "✓", text: "No Solidity knowledge needed" },
  { icon: "✓", text: "Upgradeable proxy contracts supported" },
  { icon: "✓", text: "One-click MetaMask deployment" },
  { icon: "✓", text: "Full Web3 frontend included" },
  { icon: "✓", text: "Free subdomain on every project" },
  { icon: "✓", text: "12+ EVM chains supported" },
];

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt]                 = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [visible, setVisible]               = useState(true);

  // Cycle rotating placeholder
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

  const handleSubmit = (p?: string) => {
    const text = (p ?? prompt).trim();
    if (!text) return;
    router.push(`/signup?prompt=${encodeURIComponent(text)}`);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">

      {/* ════════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full mb-8 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Powered by Claude AI · Solidity 0.8.20 · OpenZeppelin v5
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl lg:text-[4.75rem] font-bold text-gray-900 tracking-tight leading-[1.07] mb-5 max-w-3xl">
          Launch your crypto<br />
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            project in minutes
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-500 max-w-xl leading-relaxed mb-10">
          Generate smart contracts, deploy tokens, and launch Web3 apps
          instantly — no Solidity experience required.
        </p>

        {/* ── Prompt box ────────────────────────────────────────────────── */}
        <div className="w-full max-w-2xl">
          <div className="relative bg-white border border-gray-200 rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.07)] focus-within:border-indigo-300 focus-within:shadow-[0_4px_32px_rgba(99,102,241,0.12)] transition-all duration-200">

            {/* Animated placeholder */}
            {!prompt && (
              <div
                className="absolute top-4 left-5 right-32 text-gray-400 text-base leading-relaxed pointer-events-none select-none transition-opacity duration-300"
                style={{ opacity: visible ? 1 : 0 }}
              >
                {ROTATING_PROMPTS[placeholderIdx]}
              </div>
            )}

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={3}
              className="w-full bg-transparent text-gray-900 text-base px-5 pt-4 pb-16 rounded-2xl outline-none resize-none"
              placeholder=""
              aria-label="Describe the crypto project you want to launch"
            />

            <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between">
              <span className="text-xs text-gray-300 hidden sm:block">
                Tokens · NFTs · DAOs · DeFi · Staking
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-300 hidden sm:block">↵ to launch</span>
                <button
                  onClick={() => handleSubmit()}
                  disabled={!prompt.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2 rounded-xl transition-all"
                >
                  Start Launching →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Speed tagline */}
        <p className="mt-5 text-sm font-medium text-gray-400">
          From idea →{" "}
          <span className="text-indigo-600 font-semibold">blockchain launch in under 5 minutes</span>
        </p>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          LAUNCH SCENARIOS
      ════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 pb-20 max-w-4xl mx-auto w-full">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.12em] text-center mb-5">
          What do you want to launch?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {LAUNCH_SCENARIOS.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSubmit(s.prompt)}
              className="group flex flex-col items-center gap-2 bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-xl px-3 py-4 transition-all duration-150 text-left"
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="text-xs font-semibold text-gray-700 group-hover:text-indigo-700 text-center leading-tight">{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-gray-50 border-y border-gray-100 px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-3">
            How it works
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-md mx-auto">
            Block67 handles the hard parts — you focus on launching.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold mb-4">
                  {step.step}
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1.5">{step.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          WHY FOUNDERS USE BLOCK67  +  FINAL CTA
      ════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-20 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

          {/* Left — value props */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Built for founders<br />and developers
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-7">
              Whether you&apos;re launching your first token or building a full
              DeFi protocol, Block67 generates production-grade contracts with
              OpenZeppelin security — and deploys them in one click.
            </p>
            <ul className="space-y-2.5">
              {WHY_BULLETS.map((b) => (
                <li key={b.text} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                    {b.icon}
                  </span>
                  {b.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — CTA card */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 text-white text-center shadow-xl">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-2">Ready to launch?</h3>
            <p className="text-indigo-200 text-sm mb-6 leading-relaxed">
              Join founders shipping crypto projects on Block67.
              No credit card required.
            </p>
            <button
              onClick={() => router.push("/signup")}
              className="w-full bg-white text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors text-sm"
            >
              Start Launching Free →
            </button>
            <p className="mt-4 text-indigo-300 text-xs">
              Vercel for crypto projects.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
