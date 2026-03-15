"use client";
// block67 — Fresh 2024 template preview components
// Designed to match current Web3 site trends

import React from "react";
import type { TemplateId } from "./index";

export type Config = Record<string, string>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function n(v: string | undefined): string {
  const x = parseFloat(v ?? "0");
  if (isNaN(x)) return v ?? "0";
  if (x >= 1e12) return (x / 1e12).toFixed(1) + "T";
  if (x >= 1e9)  return (x / 1e9).toFixed(1)  + "B";
  if (x >= 1e6)  return (x / 1e6).toFixed(1)  + "M";
  if (x >= 1e3)  return (x / 1e3).toFixed(1)  + "K";
  return x.toLocaleString();
}

// ── ERC-20 Token — Uniswap/modern DeFi style ─────────────────────────────────

export function ERC20Preview({ config }: { config: Config }) {
  const accent = config.accentColor || "#6366f1";
  const name   = config.tokenName  || "MyToken";
  const sym    = config.symbol     || "MTK";
  const supply = config.totalSupply|| "1000000000";
  const desc   = config.description|| "The next generation of decentralized finance.";

  const hex2rgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  };
  const rgb = hex2rgb(accent.length === 7 ? accent : "#6366f1");

  return (
    <div className="min-h-full flex flex-col font-sans" style={{ background: "#07071a" }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ position: "relative" }}>
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20 blur-[80px]"
          style={{ background: `radial-gradient(circle, ${accent}, transparent)` }}
        />
      </div>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: accent }}>
            <span className="text-white text-xs font-black">{sym[0]}</span>
          </div>
          <span className="text-white font-bold text-sm">{name}</span>
        </div>
        <button
          className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-all"
          style={{ background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.3)` }}
        >
          Connect Wallet
        </button>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center text-center px-6 pt-10 pb-8 relative z-10">
        {/* Gradient badge */}
        <div
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full mb-6"
          style={{ background: `rgba(${rgb},0.1)`, border: `1px solid rgba(${rgb},0.2)`, color: accent }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
          Now live on mainnet
        </div>

        {/* Giant gradient headline */}
        <h1
          className="text-[3.5rem] font-black leading-none mb-3 tracking-tight"
          style={{ background: `linear-gradient(135deg, #ffffff 30%, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          ${sym}
        </h1>
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-4 font-medium">{name}</p>
        <p className="text-white/60 text-sm max-w-sm leading-relaxed mb-8">{desc}</p>

        {/* CTA buttons */}
        <div className="flex gap-3 mb-12">
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 0 24px rgba(${rgb},0.4)` }}
          >
            Buy ${sym}
          </button>
          <button className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white/70 border border-white/10 hover:border-white/20 bg-white/5">
            Whitepaper ↗
          </button>
        </div>

        {/* Stats strip */}
        <div className="w-full max-w-lg grid grid-cols-3 gap-3 mb-10">
          {[
            { label: "Total Supply", val: n(supply) },
            { label: "Holders",      val: "42.4K" },
            { label: "Market Cap",   val: "$4.2M" },
          ].map(({ label, val }) => (
            <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-white mb-0.5">{val}</div>
              <div className="text-[11px] text-white/40">{label}</div>
            </div>
          ))}
        </div>

        {/* Tokenomics */}
        <div className="w-full max-w-lg bg-white/4 border border-white/8 rounded-2xl p-5">
          <p className="text-white/50 text-[11px] uppercase tracking-widest font-semibold mb-4 text-left">Tokenomics</p>
          {[
            { label: "Public Sale",    pct: 60 },
            { label: "Ecosystem",      pct: 20 },
            { label: "Team & Advisors",pct: 12 },
            { label: "Liquidity",      pct: 8  },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 mb-2.5">
              <span className="text-white/50 text-xs w-28 text-left shrink-0">{row.label}</span>
              <div className="flex-1 bg-white/8 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${row.pct}%`, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }}
                />
              </div>
              <span className="text-white/60 text-xs w-7 text-right shrink-0">{row.pct}%</span>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="flex gap-2 mt-5 flex-wrap justify-center">
          {["ERC-20", config.mintable === "true" ? "Mintable ✓" : null, config.burnable === "true" ? "Burnable ✓" : null, "Audited", "KYC Doxxed"].filter(Boolean).map((f) => (
            <span key={f} className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 text-white/40 border border-white/8">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── NFT Collection — Foundation/Blur style ────────────────────────────────────

export function NFTPreview({ config }: { config: Config }) {
  const accent = config.accentColor || "#ec4899";
  const name   = config.collectionName || "My NFT Collection";
  const supply = config.maxSupply      || "10000";
  const price  = config.mintPrice      || "0.05";
  const royalty= config.royaltyPct     || "5";
  const desc   = config.description    || "A unique collection of digital art on the blockchain.";

  const minted = Math.round(parseInt(supply) * 0.247);
  const pct    = Math.round((minted / parseInt(supply)) * 100);

  const EMOJIS = ["🦊","👾","🤖","🐸","🌀","🔮","💎","🎭","🦄","🐱","🌊","🎨"];
  const COLORS  = ["#f97316","#8b5cf6","#3b82f6","#10b981","#ec4899","#eab308","#ef4444","#06b6d4","#6366f1","#14b8a6","#f59e0b","#84cc16"];

  return (
    <div className="min-h-full bg-white flex flex-col font-sans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <span className="font-bold text-gray-900 text-sm">{name}</span>
        <button
          className="text-xs font-bold px-4 py-2 rounded-xl text-white"
          style={{ background: accent }}
        >
          {price} ETH · Mint
        </button>
      </nav>

      {/* NFT grid mosaic */}
      <div className="grid grid-cols-6 gap-1 p-4">
        {EMOJIS.map((emoji, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl flex items-center justify-center text-xl font-bold shadow-sm"
            style={{ background: COLORS[i] + "22", border: `1.5px solid ${COLORS[i]}44` }}
          >
            {emoji}
          </div>
        ))}
      </div>

      {/* Mint section */}
      <div className="flex-1 px-5 py-4">
        <div className="border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-gray-900 text-lg font-bold mb-1">{name}</h2>
          <p className="text-gray-400 text-xs mb-5 leading-relaxed">{desc}</p>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: "Floor",    val: `${price} ETH` },
              { label: "Items",    val: n(supply) },
              { label: "Royalty",  val: `${royalty}%` },
            ].map(({ label, val }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <div className="font-bold text-gray-900 text-sm">{val}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Quantity selector */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600 font-medium">Quantity</span>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-200">
              <button className="text-gray-500 hover:text-gray-900 text-sm font-bold w-5">−</button>
              <span className="text-gray-900 font-bold text-sm w-4 text-center">1</span>
              <button className="text-gray-500 hover:text-gray-900 text-sm font-bold w-5">+</button>
            </div>
          </div>

          {/* Mint button */}
          <button
            className="w-full py-3 rounded-xl text-white text-sm font-bold shadow-md mb-4"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
          >
            Mint Now — {price} ETH
          </button>

          {/* Progress */}
          <div className="flex justify-between text-[11px] text-gray-400 mb-1.5">
            <span>{minted.toLocaleString()} minted</span>
            <span className="font-medium text-gray-600">{pct}% complete</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DAO Governance — Linear/Compound style ────────────────────────────────────

export function DAOPreview({ config }: { config: Config }) {
  const accent  = config.accentColor      || "#10b981";
  const daoName = config.daoName          || "My DAO";
  const token   = config.tokenName        || "GOV";
  const quorum  = config.quorumPct        || "4";
  const period  = config.votingPeriodDays || "7";
  const desc    = config.description      || "A community-governed protocol for the future.";

  const PROPOSALS = [
    { id: "GIP-15", title: "Increase dev fund allocation by 10%", status: "Active",  for: 68, against: 14, quorum: true  },
    { id: "GIP-14", title: "Deploy protocol to Base L2 network",  status: "Passed",  for: 91, against: 4,  quorum: true  },
    { id: "GIP-13", title: "Reduce voting period to 5 days",      status: "Failed",  for: 29, against: 64, quorum: true  },
    { id: "GIP-12", title: "Add stETH as collateral type",        status: "Pending", for: 0,  against: 0,  quorum: false },
  ];

  const STATUS_STYLE: Record<string, string> = {
    Active:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    Passed:  "bg-blue-50 text-blue-700 border-blue-200",
    Failed:  "bg-red-50 text-red-600 border-red-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <div className="min-h-full bg-[#f8f8fc] flex flex-col font-sans">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 flex items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: accent }}>
            <span className="text-white text-[10px] font-black">{token[0]}</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">{daoName}</span>
        </div>
        <button className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white" style={{ background: accent }}>
          Connect
        </button>
      </nav>

      {/* Stats */}
      <div className="px-5 pt-5 pb-3 grid grid-cols-4 gap-3">
        {[
          { label: "Token",         val: `$${token}` },
          { label: "Quorum",        val: `${quorum}%` },
          { label: "Voting Period", val: `${period}d` },
          { label: "Active Props",  val: "3" },
        ].map(({ label, val }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
            <div className="font-bold text-gray-900 text-sm mb-0.5">{val}</div>
            <div className="text-[10px] text-gray-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Mission */}
      <p className="px-5 text-gray-500 text-xs italic mb-4">&ldquo;{desc}&rdquo;</p>

      {/* Proposals */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-900 font-bold text-sm">Proposals</h3>
          <button className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white" style={{ background: accent }}>
            + New
          </button>
        </div>

        <div className="space-y-2.5">
          {PROPOSALS.map((p) => (
            <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-gray-400 font-mono">{p.id}</span>
                  <p className="text-gray-800 text-[13px] font-medium leading-snug mt-0.5 truncate">{p.title}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${STATUS_STYLE[p.status]}`}>
                  {p.status}
                </span>
              </div>
              {p.quorum && p.for > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-600 font-medium w-8">{p.for}%</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden flex">
                    <div className="h-full rounded-full" style={{ width: `${p.for}%`, background: accent }} />
                  </div>
                  <span className="text-[11px] text-red-400 font-medium w-8 text-right">{p.against}%</span>
                </div>
              ) : (
                <div className="text-[11px] text-gray-300">Voting not started</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Staking Dashboard — Aave/Compound style ───────────────────────────────────

export function StakingPreview({ config }: { config: Config }) {
  const accent  = config.accentColor || "#f59e0b";
  const token   = config.tokenName   || "MyToken";
  const sym     = config.symbol      || "MTK";
  const apy     = config.apy         || "12";
  const lock    = config.lockPeriod  || "30";
  const min     = config.minStake    || "100";
  const desc    = config.description || "Earn passive yield on your tokens.";

  const rgb = (() => {
    const hex = accent.replace("#","");
    if (hex.length < 6) return "245,158,11";
    return `${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)}`;
  })();

  return (
    <div className="min-h-full flex flex-col font-sans" style={{ background: "#06060f" }}>
      {/* Ambient */}
      <div
        className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-[60px] pointer-events-none"
        style={{ background: accent, position: "absolute" }}
      />

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 relative z-10">
        <span className="font-bold text-white text-sm">{token} Staking</span>
        <button
          className="text-xs font-semibold px-4 py-2 rounded-xl text-white"
          style={{ background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.3)`, color: accent }}
        >
          Connect Wallet
        </button>
      </nav>

      {/* APY Hero */}
      <div className="text-center py-8 px-6 relative z-10">
        <p className="text-white/30 text-[11px] uppercase tracking-widest mb-2 font-semibold">Annual Percentage Yield</p>
        <div
          className="text-[5rem] font-black leading-none mb-2"
          style={{ background: `linear-gradient(135deg, #ffffff, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          {apy}%
        </div>
        <p className="text-white/40 text-sm max-w-xs mx-auto">{desc}</p>
      </div>

      {/* Stats row */}
      <div className="px-5 grid grid-cols-3 gap-3 mb-5 relative z-10">
        {[
          { label: "Lock Period", val: `${lock} days` },
          { label: "Min Stake",   val: `${n(min)} ${sym}` },
          { label: "TVL",         val: "$12.4M" },
        ].map(({ label, val }) => (
          <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-3.5 text-center">
            <div className="font-bold text-white text-sm mb-0.5">{val}</div>
            <div className="text-[10px] text-white/30">{label}</div>
          </div>
        ))}
      </div>

      {/* Stake card */}
      <div className="px-5 mb-4 relative z-10">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-sm">Stake {sym}</h3>
            <span className="text-[11px] text-white/30">Balance: 5,000 {sym}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
            <span className="text-white text-sm font-semibold">0</span>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-xs">{sym}</span>
              <button
                className="text-xs font-bold px-2 py-0.5 rounded-lg"
                style={{ background: `rgba(${rgb},0.2)`, color: accent }}
              >
                MAX
              </button>
            </div>
          </div>
          <button
            className="w-full py-3 rounded-xl text-sm font-bold shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
              boxShadow: `0 0 20px rgba(${rgb},0.3)`,
              color: "#000",
            }}
          >
            Stake {sym}
          </button>
        </div>
      </div>

      {/* Position */}
      <div className="px-5 relative z-10">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-white/50 text-[11px] uppercase tracking-widest font-semibold mb-3">Your Position</p>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/50">Staked Amount</span>
            <span className="text-white font-semibold">1,000 {sym}</span>
          </div>
          <div className="flex justify-between text-sm mb-4">
            <span className="text-white/50">Pending Rewards</span>
            <span className="font-bold" style={{ color: accent }}>+24.7 {sym}</span>
          </div>
          <button
            className="w-full py-2.5 rounded-xl text-sm font-semibold border"
            style={{ borderColor: `rgba(${rgb},0.3)`, color: accent, background: `rgba(${rgb},0.06)` }}
          >
            Claim Rewards ✦
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Meme Token — viral, modern, playful ──────────────────────────────────────

export function MemePreview({ config }: { config: Config }) {
  const accent  = config.accentColor || "#eab308";
  const name    = config.tokenName   || "DogeMoon";
  const sym     = config.symbol      || "DGMN";
  const supply  = config.totalSupply || "420000000000000";
  const desc    = config.description || "Going to the moon 🚀 Community-driven. 100% SAFU.";
  const emoji   = config.emoji       || "🚀";
  const tax     = config.taxPct      || "2";

  const rgb = (() => {
    const hex = accent.replace("#","");
    if (hex.length < 6) return "234,179,8";
    return `${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)}`;
  })();

  return (
    <div className="min-h-full flex flex-col font-sans" style={{ background: "#08080c" }}>
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(${rgb},0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(${rgb},0.04) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          position: "absolute",
        }}
      />

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 relative z-10">
        <span className="font-black text-white text-base">{emoji} ${sym}</span>
        <div className="flex gap-2">
          <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60">
            Chart
          </button>
          <button
            className="text-xs font-black px-4 py-1.5 rounded-lg text-black"
            style={{ background: accent }}
          >
            BUY NOW
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center text-center px-5 pt-6 pb-6 relative z-10">
        {/* Mascot */}
        <div
          className="text-7xl mb-4 select-none"
          style={{ filter: `drop-shadow(0 0 20px rgba(${rgb},0.5))`, animation: "none" }}
        >
          {emoji}
        </div>

        {/* Name */}
        <h1
          className="text-5xl font-black mb-1 tracking-tight"
          style={{ background: `linear-gradient(135deg, #fff 40%, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          ${sym}
        </h1>
        <p className="text-white/30 text-[11px] font-medium uppercase tracking-widest mb-4">{name}</p>
        <p className="text-white/60 text-sm leading-relaxed max-w-xs mb-6">{desc}</p>

        {/* CTAs */}
        <div className="flex gap-2 mb-8">
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-black text-black shadow-lg"
            style={{ background: accent, boxShadow: `0 0 30px rgba(${rgb},0.5)` }}
          >
            Buy ${sym} 🚀
          </button>
          <button className="px-6 py-2.5 rounded-xl text-sm font-bold text-white/60 bg-white/5 border border-white/10">
            Chart 📈
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-xs mb-6">
          {[
            { label: "Supply",  val: n(supply) },
            { label: "Tax",     val: `${tax}%` },
            { label: "Holders", val: "69,420" },
            { label: "Status",  val: "🔒 SAFU" },
          ].map(({ label, val }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center border"
              style={{ background: `rgba(${rgb},0.05)`, borderColor: `rgba(${rgb},0.15)` }}
            >
              <div className="font-black text-white text-base">{val}</div>
              <div className="text-[10px] text-white/30 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Why buy */}
        <div
          className="w-full max-w-xs rounded-2xl p-4 border text-left"
          style={{ background: `rgba(${rgb},0.04)`, borderColor: `rgba(${rgb},0.12)` }}
        >
          <p className="text-white font-bold text-sm mb-2.5">Why ${sym}? 🤔</p>
          {[
            "No team tokens 💪",
            "Renounced ownership 🔓",
            "Liquidity locked 2 years 🔒",
            "Community driven 🌍",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-[12px] text-white/50 mb-1.5">
              <span style={{ color: accent }}>✓</span>
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Registry ─────────────────────────────────────────────────────────────────

export const PREVIEW_MAP: Record<TemplateId, React.FC<{ config: Config }>> = {
  "erc20-token":       ERC20Preview,
  "nft-collection":    NFTPreview,
  "dao-governance":    DAOPreview,
  "staking-dashboard": StakingPreview,
  "meme-token":        MemePreview,
};

export function TemplatePreview({ templateId, config }: { templateId: TemplateId; config: Config }) {
  const Component = PREVIEW_MAP[templateId];
  if (!Component) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
      Unknown template
    </div>
  );
  return <Component config={config} />;
}
