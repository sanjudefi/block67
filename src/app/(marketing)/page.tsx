"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ── Rotating placeholder prompts ───────────────────────────────────────────
const ROTATING_PROMPTS = [
  "A DeFi staking platform with auto-compound rewards...",
  "An ERC-20 token for my gaming ecosystem...",
  "An NFT collection with on-chain metadata and royalties...",
  "A DAO governance system with quadratic voting...",
  "A blockchain analytics dashboard with Alchemy event listeners...",
  "A token-gated community portal with NFT verification...",
  "An NFT marketplace with creator royalties and auctions...",
  "A DeFi lending protocol with liquidation protection...",
];

// ── Suggestion chips ────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { label: "ERC-20 Token",          prompt: "Deploy an ERC-20 token with custom name, symbol, supply and minting rules" },
  { label: "NFT Collection",        prompt: "Create an ERC-721 NFT collection with metadata, minting and royalties" },
  { label: "DAO Governance",        prompt: "Build a DAO with on-chain voting, proposals and a multi-sig treasury" },
  { label: "DeFi Protocol",         prompt: "Build a DeFi staking platform with reward distribution and auto-compound" },
  { label: "Gaming Platform",       prompt: "Create a blockchain gaming platform with NFT items and on-chain achievements" },
  { label: "Reporting Dashboard",   prompt: "Set up a blockchain reporting dashboard using Alchemy API event listeners" },
  { label: "Event Listeners",       prompt: "Configure Alchemy API webhooks to listen for smart contract events in real time" },
  { label: "Onboarding Portal",     prompt: "Build a Web3 onboarding portal with wallet connect and token-gated access" },
  { label: "Token Airdrop",         prompt: "Create a Merkle tree airdrop system for distributing tokens to a whitelist" },
  { label: "NFT Marketplace",       prompt: "Deploy an NFT marketplace with listings, offers, and royalty splits" },
  { label: "Networking App",        prompt: "Build a Web3 professional networking app with on-chain reputation and NFT badges" },
  { label: "Multisig Wallet",       prompt: "Create a multisig wallet with configurable signers and threshold approvals" },
];

// ── Feature pills ────────────────────────────────────────────────────────────
const FEATURES = [
  "Smart contract deployment",
  "ABI code integration",
  "Alchemy API & event listeners",
  "Claude AI backend",
  "Auto-generated dashboards",
  "Free subdomain",
  "12+ EVM chains",
];

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt]             = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [visible, setVisible]           = useState(true);

  // Cycle rotating placeholder
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPlaceholderIdx((i) => (i + 1) % ROTATING_PROMPTS.length);
        setVisible(true);
      }, 350);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    router.push(`/signup?prompt=${encodeURIComponent(prompt.trim())}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-4 pb-16 pt-8">

      {/* ── Badge ──────────────────────────────────────────────────────────── */}
      <div className="inline-flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-full mb-8">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        Exclusively for blockchain applications · Powered by Claude AI
      </div>

      {/* ── Headline ───────────────────────────────────────────────────────── */}
      <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-bold text-gray-900 text-center tracking-tight leading-[1.08] mb-4 max-w-3xl">
        Build any blockchain<br />app with AI
      </h1>
      <p className="text-lg text-gray-400 text-center mb-10 max-w-lg leading-relaxed">
        Describe what you want to build. We handle the smart contracts,
        dashboards, and give you a free subdomain.
      </p>

      {/* ── Prompt box ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <div className="relative bg-white border border-gray-200 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] focus-within:border-indigo-300 focus-within:shadow-[0_4px_24px_rgba(99,102,241,0.12)] transition-all duration-200">

          {/* Animated placeholder overlay */}
          {!prompt && (
            <div
              className="absolute top-4 left-5 right-24 text-gray-400 text-base leading-relaxed pointer-events-none select-none transition-opacity duration-300"
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
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            rows={3}
            className="w-full bg-transparent text-gray-900 text-base px-5 pt-4 pb-14 rounded-2xl outline-none resize-none"
            placeholder=""
            aria-label="Describe your blockchain application"
          />

          {/* Bottom bar */}
          <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between">
            <span className="text-xs text-gray-300 hidden sm:block">
              Blockchain apps only — smart contracts, NFTs, DeFi, DAOs
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-300 hidden sm:block">↵ Enter</span>
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all"
              >
                Build →
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ── Feature pills ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 mt-5 max-w-2xl">
        {FEATURES.map((f) => (
          <span key={f} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            {f}
          </span>
        ))}
      </div>

      {/* ── Suggestion chips ───────────────────────────────────────────────── */}
      <div className="mt-12 w-full max-w-2xl">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em] text-center mb-4">
          Not sure where to start? Try one of these:
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setPrompt(s.prompt)}
              className="bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 text-gray-600 hover:text-indigo-700 text-sm px-4 py-1.5 rounded-full transition-all duration-150 cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
