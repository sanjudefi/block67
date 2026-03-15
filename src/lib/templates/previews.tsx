"use client";
// block67 — Template preview components
// Each renders a realistic app UI based on config values

import React from "react";
import type { TemplateId } from "./index";

export type Config = Record<string, string>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: string | undefined): string {
  const num = parseFloat(n ?? "0");
  if (isNaN(num)) return n ?? "0";
  if (num >= 1e12) return (num / 1e12).toFixed(1) + "T";
  if (num >= 1e9)  return (num / 1e9).toFixed(1)  + "B";
  if (num >= 1e6)  return (num / 1e6).toFixed(1)  + "M";
  if (num >= 1e3)  return (num / 1e3).toFixed(1)  + "K";
  return num.toLocaleString();
}

function MockBtn({ children, style, className = "" }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <button
      className={`px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 ${className}`}
      style={style}
      onClick={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

function MockNavbar({ name, accent }: { name: string; accent: string }) {
  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <span className="font-bold text-white text-lg">{name}</span>
      <MockBtn style={{ background: accent }} className="text-xs px-3 py-1.5">
        Connect Wallet
      </MockBtn>
    </nav>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white/10 rounded-xl p-4 text-center border border-white/10">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/60 mt-1">{label}</div>
    </div>
  );
}

// ─── ERC-20 Token Preview ────────────────────────────────────────────────────

export function ERC20Preview({ config }: { config: Config }) {
  const accent = config.accentColor || "#6366f1";
  const name = config.tokenName || "MyToken";
  const sym  = config.symbol    || "MTK";
  const sup  = config.totalSupply || "1000000000";
  const desc = config.description || "The next generation of decentralized finance.";

  return (
    <div className="h-full flex flex-col overflow-auto" style={{ background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)" }}>
      <MockNavbar name={`${name} (${sym})`} accent={accent} />

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-10 pb-6 text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-6 shadow-2xl"
          style={{ background: `${accent}33`, border: `2px solid ${accent}66` }}
        >
          🪙
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">{name}</h1>
        <p className="text-sm font-mono text-white/50 mb-4 uppercase tracking-widest">${sym}</p>
        <p className="text-white/70 text-sm max-w-sm leading-relaxed mb-8">{desc}</p>

        <div className="flex gap-3 mb-10">
          <MockBtn style={{ background: accent }}>Buy {sym}</MockBtn>
          <MockBtn className="bg-white/10 border border-white/20">Whitepaper →</MockBtn>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-lg mb-8">
          <StatCard label="Total Supply" value={fmt(sup)} accent={accent} />
          <StatCard label="Holders"      value="12,450"   accent={accent} />
          <StatCard label="Market Cap"   value="$2.4M"    accent={accent} />
        </div>

        {/* Tokenomics */}
        <div className="w-full max-w-lg bg-white/5 rounded-2xl p-5 border border-white/10">
          <h3 className="text-white font-semibold mb-4 text-left text-sm uppercase tracking-wider">Tokenomics</h3>
          {[
            { label: "Public Sale", pct: 60 },
            { label: "Team & Advisors", pct: 15 },
            { label: "Treasury", pct: 15 },
            { label: "Liquidity", pct: 10 },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 mb-3">
              <span className="text-white/60 text-xs w-32 text-left">{row.label}</span>
              <div className="flex-1 bg-white/10 rounded-full h-2">
                <div className="h-2 rounded-full" style={{ width: `${row.pct}%`, background: accent }} />
              </div>
              <span className="text-white text-xs w-8 text-right">{row.pct}%</span>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="flex gap-2 mt-6 flex-wrap justify-center">
          {["ERC-20", config.mintable === "true" ? "Mintable ✓" : null, config.burnable === "true" ? "Burnable ✓" : null, "Audited"].filter(Boolean).map((f) => (
            <span key={f} className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── NFT Collection Preview ──────────────────────────────────────────────────

export function NFTPreview({ config }: { config: Config }) {
  const accent = config.accentColor || "#ec4899";
  const name   = config.collectionName || "My NFT Collection";
  const supply = config.maxSupply  || "10000";
  const price  = config.mintPrice  || "0.05";
  const royalty = config.royaltyPct || "5";
  const desc   = config.description || "A unique collection of digital art on the blockchain.";

  const minted = Math.floor(parseInt(supply) * 0.24);

  const PLACEHOLDERS = ["🦊","🐸","👾","🤖","🐱","🦁","🐯","🦊","🐸","👾","🤖","🐱"];

  return (
    <div className="h-full flex flex-col overflow-auto" style={{ background: "linear-gradient(135deg, #1a001f 0%, #2d0050 50%, #1a001f 100%)" }}>
      <MockNavbar name={name} accent={accent} />

      <div className="flex-1 px-6 py-8">
        {/* NFT Grid preview */}
        <div className="grid grid-cols-6 gap-2 mb-8">
          {PLACEHOLDERS.map((emoji, i) => (
            <div key={i} className="aspect-square rounded-lg flex items-center justify-center text-2xl"
              style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}>
              {emoji}
            </div>
          ))}
        </div>

        {/* Mint card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md mx-auto">
          <h2 className="text-white text-2xl font-bold mb-1">{name}</h2>
          <p className="text-white/60 text-sm mb-6">{desc}</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard label="Mint Price"  value={`${price} ETH`} accent={accent} />
            <StatCard label="Total"       value={fmt(supply)}    accent={accent} />
            <StatCard label="Royalties"   value={`${royalty}%`}  accent={accent} />
          </div>

          {/* Mint counter */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/60 text-sm">Quantity</span>
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold">−</button>
              <span className="text-white font-bold w-6 text-center">1</span>
              <button className="w-8 h-8 rounded-lg bg-white/10 text-white font-bold">+</button>
            </div>
          </div>

          <MockBtn style={{ background: accent }} className="w-full text-center block">
            Mint Now — {price} ETH
          </MockBtn>

          {/* Progress */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-white/50 mb-1.5">
              <span>{minted.toLocaleString()} minted</span>
              <span>{parseInt(supply).toLocaleString()} total</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div className="h-2 rounded-full" style={{ width: "24%", background: accent }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DAO Governance Preview ───────────────────────────────────────────────────

export function DAOPreview({ config }: { config: Config }) {
  const accent  = config.accentColor     || "#10b981";
  const name    = config.daoName         || "My DAO";
  const token   = config.tokenName       || "GOV";
  const quorum  = config.quorumPct       || "4";
  const period  = config.votingPeriodDays|| "7";
  const desc    = config.description     || "A community-governed protocol for the future.";

  const PROPOSALS = [
    { id: "IDP-12", title: "Increase treasury allocation for dev fund", status: "Active",   for: 72, against: 15 },
    { id: "IDP-11", title: "Integrate new oracle provider for price feeds", status: "Passed", for: 89, against: 4  },
    { id: "IDP-10", title: "Reduce voting period to 5 days",              status: "Failed",  for: 31, against: 62 },
  ];

  return (
    <div className="h-full flex flex-col overflow-auto bg-gray-950 text-white">
      <MockNavbar name={`${name} Governance`} accent={accent} />

      <div className="flex-1 px-6 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="Token"          value={`$${token}`}    accent={accent} />
          <StatCard label="Quorum"         value={`${quorum}%`}   accent={accent} />
          <StatCard label="Voting Period"  value={`${period}d`}   accent={accent} />
          <StatCard label="Proposals"      value="12"             accent={accent} />
        </div>

        <p className="text-white/50 text-sm mb-6 italic">&ldquo;{desc}&rdquo;</p>

        {/* Proposals */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Proposals</h3>
          <MockBtn style={{ background: accent }} className="text-xs px-3 py-1.5">+ New Proposal</MockBtn>
        </div>

        <div className="space-y-3">
          {PROPOSALS.map((p) => (
            <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs text-white/40 font-mono">{p.id}</span>
                  <p className="text-white text-sm font-medium mt-0.5">{p.title}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  p.status === "Active" ? "bg-green-500/20 text-green-400" :
                  p.status === "Passed" ? "bg-blue-500/20 text-blue-400" :
                  "bg-red-500/20 text-red-400"
                }`}>{p.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-400 w-10">{p.for}%</span>
                <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p.for}%`, background: accent }} />
                </div>
                <span className="text-xs text-red-400 w-10 text-right">{p.against}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Staking Dashboard Preview ───────────────────────────────────────────────

export function StakingPreview({ config }: { config: Config }) {
  const accent  = config.accentColor || "#f59e0b";
  const token   = config.tokenName   || "MyToken";
  const sym     = config.symbol      || "MTK";
  const apy     = config.apy         || "12";
  const lock    = config.lockPeriod  || "30";
  const min     = config.minStake    || "100";
  const desc    = config.description || "Earn passive yield on your tokens.";

  return (
    <div className="h-full flex flex-col overflow-auto" style={{ background: "linear-gradient(135deg, #1a1200 0%, #2d2000 50%, #1a1200 100%)" }}>
      <MockNavbar name={`${token} Staking`} accent={accent} />

      <div className="flex-1 px-6 py-6">
        {/* APY Hero */}
        <div className="text-center mb-8 py-6 bg-white/5 rounded-2xl border border-white/10">
          <div className="text-6xl font-black mb-1" style={{ color: accent }}>{apy}%</div>
          <div className="text-white/60 text-sm">Annual Percentage Yield</div>
          <p className="text-white/40 text-xs mt-2 max-w-xs mx-auto">{desc}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Lock Period"   value={`${lock}d`}       accent={accent} />
          <StatCard label="Min Stake"     value={`${fmt(min)} ${sym}`} accent={accent} />
          <StatCard label="Total Staked"  value="2.4M"              accent={accent} />
        </div>

        {/* Stake card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
          <h3 className="text-white font-semibold mb-4">Stake {sym}</h3>
          <div className="bg-white/5 rounded-xl p-3 mb-3 flex justify-between items-center border border-white/10">
            <span className="text-white/60 text-sm">Amount</span>
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs">Balance: 5,000 {sym}</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${accent}33`, color: accent }}>MAX</span>
            </div>
          </div>
          <MockBtn style={{ background: accent }} className="w-full text-center block">
            Stake {sym}
          </MockBtn>
        </div>

        {/* Your position */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3 text-sm">Your Position</h3>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/60">Staked</span>
            <span className="text-white font-medium">1,000 {sym}</span>
          </div>
          <div className="flex justify-between text-sm mb-4">
            <span className="text-white/60">Pending Rewards</span>
            <span className="font-medium" style={{ color: accent }}>+24.7 {sym}</span>
          </div>
          <MockBtn className="w-full bg-white/10 text-center border border-white/20 block" style={{ color: accent }}>
            Claim Rewards
          </MockBtn>
        </div>
      </div>
    </div>
  );
}

// ─── Meme Token Preview ──────────────────────────────────────────────────────

export function MemePreview({ config }: { config: Config }) {
  const accent  = config.accentColor || "#eab308";
  const name    = config.tokenName   || "DogeMoon";
  const sym     = config.symbol      || "DGMN";
  const supply  = config.totalSupply || "420000000000000";
  const desc    = config.description || "Going to the moon 🚀 Community-driven. 100% SAFU.";
  const emoji   = config.emoji       || "🚀";
  const tax     = config.taxPct      || "2";

  return (
    <div className="h-full flex flex-col overflow-auto text-center" style={{ background: "linear-gradient(135deg, #0d0d00 0%, #1a1a00 50%, #0d0d00 100%)" }}>
      <MockNavbar name={`${name} ${emoji}`} accent={accent} />

      <div className="flex-1 px-6 pt-10 pb-6 flex flex-col items-center">
        {/* Animated emoji */}
        <div className="text-8xl mb-4 animate-bounce">{emoji}</div>

        <h1 className="text-5xl font-black text-white mb-1" style={{ textShadow: `0 0 30px ${accent}` }}>
          ${sym}
        </h1>
        <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-4">{name}</p>
        <p className="text-lg text-white/80 max-w-sm mb-8 font-medium">{desc}</p>

        <div className="flex gap-3 mb-10">
          <MockBtn style={{ background: accent, color: "#000", fontWeight: 900 }}>Buy ${sym} 🚀</MockBtn>
          <MockBtn className="bg-white/10 border border-white/20">Chart 📈</MockBtn>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
          <StatCard label="Total Supply" value={fmt(supply)} accent={accent} />
          <StatCard label="Tax"          value={`${tax}%`}   accent={accent} />
          <StatCard label="Holders"      value="69,420"      accent={accent} />
          <StatCard label="Status"       value="🔒 SAFU"     accent={accent} />
        </div>

        {/* Viral section */}
        <div className="w-full max-w-sm bg-white/5 rounded-2xl p-5 border border-white/10">
          <p className="text-white font-bold mb-3">Why {sym}? 🤔</p>
          {["No VC 💪", "Renounced ownership 🔓", "Liquidity locked 🔒", "Community driven 🌍"].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-white/70 mb-2">
              <span className="text-green-400">✓</span> {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const PREVIEW_MAP: Record<TemplateId, React.FC<{ config: Config }>> = {
  "erc20-token":       ERC20Preview,
  "nft-collection":    NFTPreview,
  "dao-governance":    DAOPreview,
  "staking-dashboard": StakingPreview,
  "meme-token":        MemePreview,
};

export function TemplatePreview({ templateId, config }: { templateId: TemplateId; config: Config }) {
  const Component = PREVIEW_MAP[templateId];
  if (!Component) return <div className="flex items-center justify-center h-full text-gray-500">Unknown template</div>;
  return <Component config={config} />;
}
