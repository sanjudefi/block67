"use client";
// block67 — Template preview components
// Modern Web3 aesthetics with full light/dark theme support

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

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "99,102,241";
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}

interface ThemeVars {
  isDark: boolean;
  bg: string;
  navBg: string;
  navBorder: string;
  cardBg: string;
  cardBorder: string;
  text: string;
  textSub: string;
  textMuted: string;
}

function getTheme(config: Config, defaultDark = true): ThemeVars {
  const isDark = config.theme ? config.theme === "dark" : defaultDark;
  if (isDark) {
    return {
      isDark: true,
      bg:          "#07071a",
      navBg:       "rgba(7,7,26,0.9)",
      navBorder:   "rgba(255,255,255,0.06)",
      cardBg:      "rgba(255,255,255,0.06)",
      cardBorder:  "rgba(255,255,255,0.10)",
      text:        "#ffffff",
      textSub:     "rgba(255,255,255,0.65)",
      textMuted:   "rgba(255,255,255,0.45)",
    };
  }
  return {
    isDark: false,
    bg:          "#f8f9fb",
    navBg:       "#ffffff",
    navBorder:   "#e5e7eb",
    cardBg:      "#ffffff",
    cardBorder:  "#e5e7eb",
    text:        "#111827",
    textSub:     "#374151",
    textMuted:   "#6b7280",
  };
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, val, theme }: { label: string; val: string; theme: ThemeVars }) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
    >
      <div className="font-bold text-sm mb-0.5" style={{ color: theme.text }}>{val}</div>
      <div className="text-[10px] font-medium" style={{ color: theme.textMuted }}>{label}</div>
    </div>
  );
}

// ── ERC-20 Token ──────────────────────────────────────────────────────────────

export function ERC20Preview({ config }: { config: Config }) {
  const accent = config.accentColor || "#6366f1";
  const name   = config.tokenName   || "MyToken";
  const sym    = config.symbol      || "MTK";
  const supply = config.totalSupply || "1000000000";
  const desc   = config.description || "The next generation of decentralized finance.";
  const rgb    = hexToRgb(accent);
  const t      = getTheme(config, true);

  return (
    <div className="min-h-full flex flex-col font-sans" style={{ background: t.bg }}>
      {/* Ambient glow — dark only */}
      {t.isDark && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full opacity-15 blur-[80px] pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent}, transparent)`, position: "absolute" }}
        />
      )}

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4 relative z-10"
        style={{ background: t.navBg, borderBottom: `1px solid ${t.navBorder}` }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: accent }}>
            <span className="text-white text-xs font-black">{sym[0]}</span>
          </div>
          <span className="font-bold text-sm" style={{ color: t.text }}>{name}</span>
        </div>
        <button
          className="text-xs font-semibold px-4 py-2 rounded-xl transition-all"
          style={t.isDark
            ? { background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.3)`, color: accent }
            : { background: accent, color: "#fff" }
          }
        >
          Connect Wallet
        </button>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center text-center px-6 pt-10 pb-8 relative z-10">
        {/* Live badge */}
        <div
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full mb-6"
          style={{ background: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.25)`, color: accent }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
          Now live on mainnet
        </div>

        {/* Symbol headline */}
        <h1
          className="text-[3.5rem] font-black leading-none mb-2 tracking-tight"
          style={t.isDark
            ? { background: `linear-gradient(135deg, #ffffff 30%, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
            : { color: accent }
          }
        >
          ${sym}
        </h1>
        <p className="text-xs uppercase tracking-[0.2em] mb-3 font-medium" style={{ color: t.textMuted }}>{name}</p>
        <p className="text-sm max-w-sm leading-relaxed mb-8" style={{ color: t.textSub }}>{desc}</p>

        {/* CTAs */}
        <div className="flex gap-3 mb-10">
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg"
            style={{ background: accent, boxShadow: t.isDark ? `0 0 24px rgba(${rgb},0.4)` : "none" }}
          >
            Buy ${sym}
          </button>
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, color: t.textSub }}
          >
            Whitepaper ↗
          </button>
        </div>

        {/* Stats — horizontal 3-col */}
        <div className="w-full max-w-lg grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total Supply", val: n(supply) },
            { label: "Holders",      val: "42.4K" },
            { label: "Market Cap",   val: "$4.2M" },
          ].map(({ label, val }) => (
            <StatCard key={label} label={label} val={val} theme={t} />
          ))}
        </div>

        {/* Tokenomics */}
        <div
          className="w-full max-w-lg rounded-2xl p-5"
          style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
        >
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-4 text-left" style={{ color: t.textMuted }}>
            Tokenomics
          </p>
          {[
            { label: "Public Sale",     pct: 60 },
            { label: "Ecosystem",       pct: 20 },
            { label: "Team & Advisors", pct: 12 },
            { label: "Liquidity",       pct: 8  },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 mb-2.5">
              <span className="text-xs w-28 text-left shrink-0" style={{ color: t.textSub }}>{row.label}</span>
              <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: t.isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb" }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${row.pct}%`, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }}
                />
              </div>
              <span className="text-xs w-7 text-right shrink-0" style={{ color: t.textSub }}>{row.pct}%</span>
            </div>
          ))}
        </div>

        {/* Feature badges */}
        <div className="flex gap-2 mt-5 flex-wrap justify-center">
          {["ERC-20", config.mintable === "true" ? "Mintable ✓" : null, config.burnable === "true" ? "Burnable ✓" : null, "Audited", "KYC"].filter(Boolean).map((f) => (
            <span
              key={f}
              className="text-[11px] px-2.5 py-1 rounded-full"
              style={{ background: t.cardBg, color: t.textMuted, border: `1px solid ${t.cardBorder}` }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── NFT Collection ────────────────────────────────────────────────────────────

export function NFTPreview({ config }: { config: Config }) {
  const accent  = config.accentColor    || "#ec4899";
  const name    = config.collectionName || "My NFT Collection";
  const supply  = config.maxSupply      || "10000";
  const price   = config.mintPrice      || "0.05";
  const royalty = config.royaltyPct     || "5";
  const desc    = config.description    || "A unique collection of digital art on the blockchain.";
  const t       = getTheme(config, false);

  const minted = Math.round(parseInt(supply) * 0.247);
  const pct    = Math.round((minted / parseInt(supply)) * 100);

  const EMOJIS = ["🦊","👾","🤖","🐸","🌀","🔮","💎","🎭","🦄","🐱","🌊","🎨"];
  const COLORS = ["#f97316","#8b5cf6","#3b82f6","#10b981","#ec4899","#eab308","#ef4444","#06b6d4","#6366f1","#14b8a6","#f59e0b","#84cc16"];

  return (
    <div className="min-h-full flex flex-col font-sans" style={{ background: t.bg }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4"
        style={{ background: t.navBg, borderBottom: `1px solid ${t.navBorder}` }}
      >
        <span className="font-bold text-sm" style={{ color: t.text }}>{name}</span>
        <button className="text-xs font-bold px-4 py-2 rounded-xl text-white" style={{ background: accent }}>
          {price} ETH · Mint
        </button>
      </nav>

      {/* NFT grid */}
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
        <div className="rounded-2xl p-5 shadow-sm" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: t.text }}>{name}</h2>
          <p className="text-xs mb-5 leading-relaxed" style={{ color: t.textMuted }}>{desc}</p>

          {/* Stats — horizontal 3-col */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: "Floor",   val: `${price} ETH` },
              { label: "Items",   val: n(supply) },
              { label: "Royalty", val: `${royalty}%` },
            ].map(({ label, val }) => (
              <StatCard key={label} label={label} val={val} theme={t} />
            ))}
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium" style={{ color: t.textSub }}>Quantity</span>
            <div
              className="flex items-center gap-3 rounded-xl px-3 py-1.5"
              style={{ background: t.isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6", border: `1px solid ${t.cardBorder}` }}
            >
              <button className="text-sm font-bold w-5" style={{ color: t.textMuted }}>−</button>
              <span className="font-bold text-sm w-4 text-center" style={{ color: t.text }}>1</span>
              <button className="text-sm font-bold w-5" style={{ color: t.textMuted }}>+</button>
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
          <div className="flex justify-between text-[11px] mb-1.5" style={{ color: t.textMuted }}>
            <span>{minted.toLocaleString()} minted</span>
            <span className="font-medium" style={{ color: t.textSub }}>{pct}% complete</span>
          </div>
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: t.isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb" }}>
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

// ── DAO Governance ────────────────────────────────────────────────────────────

export function DAOPreview({ config }: { config: Config }) {
  const accent  = config.accentColor      || "#10b981";
  const daoName = config.daoName          || "My DAO";
  const token   = config.tokenName        || "GOV";
  const quorum  = config.quorumPct        || "4";
  const period  = config.votingPeriodDays || "7";
  const desc    = config.description      || "A community-governed protocol for the future.";
  const t       = getTheme(config, false);

  const PROPOSALS = [
    { id: "GIP-15", title: "Increase dev fund allocation by 10%", status: "Active",  for: 68, against: 14, hasVotes: true  },
    { id: "GIP-14", title: "Deploy protocol to Base L2 network",  status: "Passed",  for: 91, against: 4,  hasVotes: true  },
    { id: "GIP-13", title: "Reduce voting period to 5 days",      status: "Failed",  for: 29, against: 64, hasVotes: true  },
    { id: "GIP-12", title: "Add stETH as collateral type",        status: "Pending", for: 0,  against: 0,  hasVotes: false },
  ];

  const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
    Active:  { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
    Passed:  { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    Failed:  { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
    Pending: { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  };

  return (
    <div className="min-h-full flex flex-col font-sans" style={{ background: t.bg }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-3.5"
        style={{ background: t.navBg, borderBottom: `1px solid ${t.navBorder}` }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: accent }}>
            <span className="text-white text-[10px] font-black">{token[0]}</span>
          </div>
          <span className="font-bold text-sm" style={{ color: t.text }}>{daoName}</span>
        </div>
        <button className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white" style={{ background: accent }}>
          Connect
        </button>
      </nav>

      {/* Stats — horizontal 4-col */}
      <div className="px-5 pt-5 pb-3 grid grid-cols-4 gap-2">
        {[
          { label: "Token",         val: `$${token}` },
          { label: "Quorum",        val: `${quorum}%` },
          { label: "Voting Period", val: `${period}d` },
          { label: "Active Props",  val: "3" },
        ].map(({ label, val }) => (
          <StatCard key={label} label={label} val={val} theme={t} />
        ))}
      </div>

      {/* Mission */}
      <p className="px-5 text-xs italic mb-4" style={{ color: t.textMuted }}>&ldquo;{desc}&rdquo;</p>

      {/* Proposals */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm" style={{ color: t.text }}>Proposals</h3>
          <button className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white" style={{ background: accent }}>
            + New
          </button>
        </div>

        <div className="space-y-2.5">
          {PROPOSALS.map((p) => {
            const s = STATUS_STYLE[p.status];
            return (
              <div
                key={p.id}
                className="rounded-xl p-4"
                style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
              >
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono" style={{ color: t.textMuted }}>{p.id}</span>
                    <p className="text-[13px] font-medium leading-snug mt-0.5 truncate" style={{ color: t.textSub }}>{p.title}</p>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0"
                    style={{ background: s.bg, color: s.color, borderColor: s.border }}
                  >
                    {p.status}
                  </span>
                </div>
                {p.hasVotes && p.for > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium w-8" style={{ color: "#16a34a" }}>{p.for}%</span>
                    <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: t.isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb" }}>
                      <div className="h-full rounded-full" style={{ width: `${p.for}%`, background: accent }} />
                    </div>
                    <span className="text-[11px] font-medium w-8 text-right" style={{ color: "#dc2626" }}>{p.against}%</span>
                  </div>
                ) : (
                  <div className="text-[11px]" style={{ color: t.textMuted }}>Voting not started</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Staking Dashboard ─────────────────────────────────────────────────────────

export function StakingPreview({ config }: { config: Config }) {
  const accent = config.accentColor || "#f59e0b";
  const token  = config.tokenName   || "MyToken";
  const sym    = config.symbol      || "MTK";
  const apy    = config.apy         || "12";
  const lock   = config.lockPeriod  || "30";
  const min    = config.minStake    || "100";
  const desc   = config.description || "Earn passive yield on your tokens.";
  const rgb    = hexToRgb(accent);
  const t      = getTheme(config, true);

  return (
    <div className="min-h-full flex flex-col font-sans" style={{ background: t.bg }}>
      {/* Ambient glow — dark only */}
      {t.isDark && (
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-[60px] pointer-events-none"
          style={{ background: accent, position: "absolute" }}
        />
      )}

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4 relative z-10"
        style={{ background: t.navBg, borderBottom: `1px solid ${t.navBorder}` }}
      >
        <span className="font-bold text-sm" style={{ color: t.text }}>{token} Staking</span>
        <button
          className="text-xs font-semibold px-4 py-2 rounded-xl"
          style={t.isDark
            ? { background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.3)`, color: accent }
            : { background: accent, color: "#fff" }
          }
        >
          Connect Wallet
        </button>
      </nav>

      {/* APY Hero */}
      <div className="text-center py-8 px-6 relative z-10">
        <p className="text-[11px] uppercase tracking-widest mb-2 font-semibold" style={{ color: t.textMuted }}>
          Annual Percentage Yield
        </p>
        <div
          className="text-[5rem] font-black leading-none mb-2"
          style={t.isDark
            ? { background: `linear-gradient(135deg, #ffffff, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
            : { color: accent }
          }
        >
          {apy}%
        </div>
        <p className="text-sm max-w-xs mx-auto" style={{ color: t.textSub }}>{desc}</p>
      </div>

      {/* Stats — horizontal 3-col */}
      <div className="px-5 grid grid-cols-3 gap-3 mb-5 relative z-10">
        {[
          { label: "Lock Period", val: `${lock} days` },
          { label: "Min Stake",   val: `${n(min)} ${sym}` },
          { label: "TVL",         val: "$12.4M" },
        ].map(({ label, val }) => (
          <StatCard key={label} label={label} val={val} theme={t} />
        ))}
      </div>

      {/* Stake card */}
      <div className="px-5 mb-4 relative z-10">
        <div className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm" style={{ color: t.text }}>Stake {sym}</h3>
            <span className="text-[11px]" style={{ color: t.textMuted }}>Balance: 5,000 {sym}</span>
          </div>
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between mb-4"
            style={{ background: t.isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", border: `1px solid ${t.cardBorder}` }}
          >
            <span className="text-sm font-semibold" style={{ color: t.text }}>0</span>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: t.textMuted }}>{sym}</span>
              <button
                className="text-xs font-bold px-2 py-0.5 rounded-lg"
                style={{ background: `rgba(${rgb},0.15)`, color: accent }}
              >
                MAX
              </button>
            </div>
          </div>
          <button
            className="w-full py-3 rounded-xl text-sm font-bold shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
              boxShadow: t.isDark ? `0 0 20px rgba(${rgb},0.3)` : "none",
              color: t.isDark ? "#000" : "#fff",
            }}
          >
            Stake {sym}
          </button>
        </div>
      </div>

      {/* Position */}
      <div className="px-5 relative z-10">
        <div className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: t.textMuted }}>
            Your Position
          </p>
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: t.textMuted }}>Staked Amount</span>
            <span className="font-semibold" style={{ color: t.text }}>1,000 {sym}</span>
          </div>
          <div className="flex justify-between text-sm mb-4">
            <span style={{ color: t.textMuted }}>Pending Rewards</span>
            <span className="font-bold" style={{ color: accent }}>+24.7 {sym}</span>
          </div>
          <button
            className="w-full py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: `1px solid ${t.cardBorder}`, color: accent, background: `rgba(${rgb},0.08)` }}
          >
            Claim Rewards ✦
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Meme Token ────────────────────────────────────────────────────────────────

export function MemePreview({ config }: { config: Config }) {
  const accent = config.accentColor || "#eab308";
  const name   = config.tokenName   || "DogeMoon";
  const sym    = config.symbol      || "DGMN";
  const supply = config.totalSupply || "420000000000000";
  const desc   = config.description || "Going to the moon 🚀 Community-driven. 100% SAFU.";
  const emoji  = config.emoji       || "🚀";
  const tax    = config.taxPct      || "2";
  const rgb    = hexToRgb(accent);
  const t      = getTheme(config, true);

  return (
    <div className="min-h-full flex flex-col font-sans" style={{ background: t.bg }}>
      {/* Grid background — dark only */}
      {t.isDark && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(${rgb},0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(${rgb},0.05) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
            position: "absolute",
          }}
        />
      )}

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4 relative z-10"
        style={{ background: t.navBg, borderBottom: `1px solid ${t.navBorder}` }}
      >
        <span className="font-black text-base" style={{ color: t.text }}>{emoji} ${sym}</span>
        <div className="flex gap-2">
          <button
            className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, color: t.textSub }}
          >
            Chart
          </button>
          <button
            className="text-xs font-black px-4 py-1.5 rounded-lg"
            style={{ background: accent, color: t.isDark ? "#000" : "#fff" }}
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
          style={{ filter: t.isDark ? `drop-shadow(0 0 20px rgba(${rgb},0.5))` : "none" }}
        >
          {emoji}
        </div>

        {/* Token name */}
        <h1
          className="text-5xl font-black mb-1 tracking-tight"
          style={t.isDark
            ? { background: `linear-gradient(135deg, #fff 40%, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
            : { color: accent }
          }
        >
          ${sym}
        </h1>
        <p className="text-[11px] font-medium uppercase tracking-widest mb-4" style={{ color: t.textMuted }}>{name}</p>
        <p className="text-sm leading-relaxed max-w-xs mb-6" style={{ color: t.textSub }}>{desc}</p>

        {/* CTAs */}
        <div className="flex gap-2 mb-8">
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-black shadow-lg"
            style={{
              background: accent,
              color: t.isDark ? "#000" : "#fff",
              boxShadow: t.isDark ? `0 0 30px rgba(${rgb},0.5)` : "none",
            }}
          >
            Buy ${sym} 🚀
          </button>
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, color: t.textSub }}
          >
            Chart 📈
          </button>
        </div>

        {/* Stats — horizontal 4-col (was 2x2, now one row) */}
        <div className="grid grid-cols-4 gap-2 w-full max-w-sm mb-6">
          {[
            { label: "Supply",  val: n(supply) },
            { label: "Tax",     val: `${tax}%` },
            { label: "Holders", val: "69,420" },
            { label: "Status",  val: "🔒 SAFU" },
          ].map(({ label, val }) => (
            <StatCard key={label} label={label} val={val} theme={t} />
          ))}
        </div>

        {/* Why buy */}
        <div
          className="w-full max-w-sm rounded-2xl p-4 text-left"
          style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
        >
          <p className="font-bold text-sm mb-2.5" style={{ color: t.text }}>Why ${sym}? 🤔</p>
          {[
            "No team tokens 💪",
            "Renounced ownership 🔓",
            "Liquidity locked 2 years 🔒",
            "Community driven 🌍",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-[12px] mb-1.5" style={{ color: t.textSub }}>
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
