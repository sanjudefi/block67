"use client";
/**
 * Block67 Public dApp Shell — Beautiful dark-theme edition
 *
 * Renders a fully interactive Web3 dApp for each deployed project.
 * Each template type gets its own UI — real on-chain reads & writes via ethers.js.
 *
 * Flow:
 *   server page.tsx  →  serializes project + deployment from DB
 *   this file        →  wallet connect + contract interaction
 */

import { useState, useEffect, useCallback } from "react";
import {
  Wallet, ExternalLink, Copy, CheckCircle2, AlertCircle,
  Loader2, Zap, RefreshCw, Send, Coins, Image, Vote, TrendingUp,
  MessageCircle, Mail, Twitter, Github, Globe, Users, ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeploymentInfo {
  contractAddress: string;
  evmChainId:      number;
  chainName:       string;
  explorerUrl:     string;
  nativeCurrency:  string;
  rpcUrl:          string;
  contractAbi:     object[] | null;
  txHash:          string | null;
}

export interface ProjectData {
  id:          string;
  slug:        string;
  name:        string;
  templateKey: string;
  config:      Record<string, string>;
  deployment:  DeploymentInfo | null;
}

interface WalletState {
  address:   string;
  chainId:   number | null;
  connected: boolean;
}

// ── Fallback ABIs (human-readable fragments for standard block67 contracts) ───

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function owner() view returns (address)",
  "function mint(address to, uint256 amount)",
  "function taxBps() view returns (uint256)",
  // Pausable
  "function paused() view returns (bool)",
  "function pause()",
  "function unpause()",
  // Blacklist
  "function blacklisted(address) view returns (bool)",
  "function setBlacklist(address addr, bool blocked)",
  // Anti-whale
  "function maxTxAmount() view returns (uint256)",
  "function setMaxTxAmount(uint256 amount)",
  // Excluded
  "function isExcluded(address) view returns (bool)",
  "function setExcluded(address a, bool v)",
];

const ERC721_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function MINT_PRICE() view returns (uint256)",
  "function saleActive() view returns (bool)",
  "function publicMint() view returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function mint(uint256 quantity) payable",
  "function ownerMint(address to, uint256 qty)",
  "function setSaleActive(bool active)",
  "function setPublicMint(bool active)",
  "function owner() view returns (address)",
  "function totalMinted() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
];

const PUMP_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function currentPrice() view returns (uint256)",
  "function buy() payable",
  "function sell(uint256 amount)",
  "event TokensBought(address indexed buyer, uint256 ethIn, uint256 tokensOut, uint256 newPrice)",
  "event TokensSold(address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 newPrice)",
];

const OPEN_EDITION_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function MINT_PRICE() view returns (uint256)",
  "function saleActive() view returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function mint(uint256 quantity) payable",
  "function ownerMint(address to, uint256 qty)",
  "function setSaleActive(bool active)",
  "function totalMinted() view returns (uint256)",
  "function owner() view returns (address)",
  "function withdraw()",
];

const TOKEN_GATE_ABI = [
  "function hasAccess(address user) view returns (bool)",
  "function minBalance() view returns (uint256)",
  "function gateToken() view returns (address)",
  "function checkAndGetAccess() returns (string)",
  "function contentTitle() view returns (string)",
];

const CLICK_EARN_ABI = [
  "function click()",
  "function claim()",
  "function deposit() payable",
  "function rewardPerClick() view returns (uint256)",
  "function dailyLimit() view returns (uint256)",
  "function cooldown() view returns (uint256)",
  "function totalClicks(address) view returns (uint256)",
  "function pendingRewards(address) view returns (uint256)",
  "function lastClickTime(address) view returns (uint256)",
  "function timeUntilNextClick(address) view returns (uint256)",
  "function owner() view returns (address)",
];

const STAKING_ABI = [
  "function APY_BPS() view returns (uint256)",
  "function LOCK_SECS() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function staked(address) view returns (uint256)",
  "function earned(address) view returns (uint256)",
  "function stakedAt(address) view returns (uint256)",
  "function stakeToken() view returns (address)",
  "function stake(uint256 amount)",
  "function unstake(uint256 amount)",
  "function claimReward()",
];

const DAO_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function delegates(address) view returns (address)",
  "function delegate(address delegatee)",
  "function owner() view returns (address)",
  "function mint(address to, uint256 amount)",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmtUnits(raw: bigint, decimals = 18, precision = 4): string {
  const divisor = 10n ** BigInt(decimals);
  const whole   = raw / divisor;
  const frac    = raw % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, precision).replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

function parseUnits(val: string, decimals = 18): bigint {
  const [w, f = ""] = val.split(".");
  const fracPadded = f.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(w || "0") * (10n ** BigInt(decimals)) + BigInt(fracPadded || "0");
}

// ── Provider helper ───────────────────────────────────────────────────────────
// When wallet is connected use MetaMask's injected provider for reads — it is
// always on the correct chain and avoids public RPC rate-limits / timeouts.
// Falls back to JsonRpcProvider when no wallet is available (page load, SEO).
async function mkReadProvider(rpcUrl: string, walletConnected = false) {
  const { ethers } = await import("ethers");
  if (walletConnected && typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return new ethers.JsonRpcProvider(rpcUrl);
}

// ── Theme ─────────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return isNaN(r) ? "99,102,241" : `${r},${g},${b}`;
}

function getAccent(config: Record<string, string>) {
  return config.accentColor || config.brandColor || "#6366f1";
}

function getBg(config: Record<string, string>) {
  return config._bgColor || "#0a0a0f";
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function NetBadge({ chainName }: { chainName: string }) {
  return (
    <span className="text-[11px] font-semibold border border-white/20 bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
      {chainName}
    </span>
  );
}

function TxLink({ hash, explorerUrl, accent }: { hash: string; explorerUrl: string; accent: string }) {
  return (
    <a href={`${explorerUrl}/tx/${hash}`} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
      style={{ color: accent }}>
      View on explorer <ExternalLink className="w-3 h-3" />
    </a>
  );
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border mb-4 ${
      ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
         : "bg-red-500/10 border-red-500/30 text-red-400"
    }`}>
      {ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-white/30 hover:text-white/70 transition-colors">
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Site Nav ──────────────────────────────────────────────────────────────────

function SiteNav({ name, symbol, chainName, accent, wallet, connect, onWrongChain, switchChain }: {
  name: string; symbol: string; chainName: string; accent: string;
  wallet: WalletState; connect: () => void; onWrongChain: boolean; switchChain: () => void;
}) {
  const rgb = hexToRgb(accent);
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10"
      style={{ background: `rgba(10,10,15,0.85)`, backdropFilter: "blur(16px)" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `rgba(${rgb},0.2)`, border: `1px solid rgba(${rgb},0.4)` }}>
          <span className="text-xs font-bold" style={{ color: accent }}>{symbol.slice(0,2)}</span>
        </div>
        <span className="font-bold text-white text-sm truncate flex-1">{name}</span>
        <NetBadge chainName={chainName} />
        {onWrongChain
          ? <button onClick={switchChain} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors">Switch Network</button>
          : wallet.connected
            ? <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-white/70 font-mono">{shortenAddress(wallet.address)}</span>
              </div>
            : <button onClick={connect} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90"
                style={{ background: accent }}>
                Connect Wallet
              </button>
        }
      </div>
    </nav>
  );
}

// ── Hero Section ──────────────────────────────────────────────────────────────

function SiteHero({ name, symbol, description, accent, config, connect, walletConnected }: {
  name: string; symbol: string; description: string; accent: string; config: Record<string,string>;
  connect: () => void; walletConnected: boolean;
}) {
  const rgb = hexToRgb(accent);
  const website = config.website || config.projectWebsite || "";
  return (
    <section className="relative overflow-hidden pt-20 pb-16 px-4 text-center">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(ellipse, rgba(${rgb},0.6) 0%, transparent 70%)` }} />
      </div>
      <div className="relative max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border mb-6"
          style={{ borderColor: `rgba(${rgb},0.4)`, background: `rgba(${rgb},0.1)`, color: accent }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
          Live on-chain
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-2">
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, #fff 30%, rgba(${rgb},0.9) 100%)` }}>
            {name}
          </span>
        </h1>
        <p className="text-2xl font-bold mb-4" style={{ color: accent }}>${symbol}</p>
        {description && <p className="text-white/60 text-base leading-relaxed mb-8 max-w-lg mx-auto">{description}</p>}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {!walletConnected && (
            <button onClick={connect} className="px-6 py-3 rounded-xl font-bold text-white text-sm shadow-lg transition-all hover:scale-105 hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${accent}, rgba(${rgb},0.7))`, boxShadow: `0 0 20px rgba(${rgb},0.4)` }}>
              Connect Wallet
            </button>
          )}
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl font-semibold text-sm border border-white/20 bg-white/5 text-white/70 hover:bg-white/10 transition-colors flex items-center gap-2">
              <Globe className="w-4 h-4" /> Website
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Glass Card ────────────────────────────────────────────────────────────────

function GlassCard({ children, className = "", accent = "#6366f1" }: { children: import("react").ReactNode; className?: string; accent?: string }) {
  const rgb = hexToRgb(accent);
  return (
    <div className={`rounded-2xl border p-5 ${className}`}
      style={{ background: "rgba(255,255,255,0.04)", borderColor: `rgba(${rgb},0.2)`, backdropFilter: "blur(8px)" }}>
      {children}
    </div>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────────

interface TeamMember { name: string; role: string; bio?: string; avatar?: string; photo?: string; twitter?: string; }
interface FaqItem    { q: string; a: string; }

function TeamSection({ json, accent }: { json: string; accent: string }) {
  let members: TeamMember[] = [];
  try { members = JSON.parse(json); } catch { return null; }
  if (!members.length) return null;
  const rgb = hexToRgb(accent);
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-10">
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, #fff 40%, rgba(${rgb},0.9) 100%)` }}>
            Meet the Team
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m, i) => (
            <GlassCard key={i} accent={accent}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                  style={{ background: `rgba(${rgb},0.2)`, color: accent }}>
                  {(m.photo || m.avatar) ? <img src={m.photo || m.avatar} className="w-10 h-10 rounded-full object-cover" alt={m.name} /> : m.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{m.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: accent }}>{m.role}</p>
                  {m.bio && <p className="text-xs text-white/50 mt-1 leading-relaxed">{m.bio}</p>}
                  {m.twitter && (
                    <a href={`https://twitter.com/${m.twitter.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                      className="mt-1.5 flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors">
                      <Twitter className="w-3 h-3" /> @{m.twitter.replace("@","")}
                    </a>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection({ json, accent }: { json: string; accent: string }) {
  let items: FaqItem[] = [];
  try { items = JSON.parse(json); } catch { return null; }
  if (!items.length) return null;
  const [open, setOpen] = useState<number | null>(null);
  const rgb = hexToRgb(accent);
  return (
    <section className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-10">
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, #fff 40%, rgba(${rgb},0.9) 100%)` }}>
            FAQ
          </span>
        </h2>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              <button onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 hover:bg-white/5 transition-colors">
                <span className="text-sm font-medium text-white">{item.q}</span>
                {open === i ? <ChevronUp className="w-4 h-4 text-white/40 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />}
              </button>
              {open === i && <p className="px-5 pb-4 text-sm text-white/60 leading-relaxed">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection({ config, accent }: { config: Record<string,string>; accent: string }) {
  const email    = config._contact_email || "";
  const phone    = config._contact_phone || "";
  const location = config._contact_location || "";
  const address  = config._contact_address || "";
  if (!email && !phone && !location && !address) return null;
  const rgb = hexToRgb(accent);
  return (
    <section className="py-16 px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.3)` }}>
          <Mail className="w-6 h-6" style={{ color: accent }} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Get in Touch</h2>
        <p className="text-white/50 text-sm mb-6">Have questions about the project? We&apos;d love to hear from you.</p>
        <div className="space-y-3">
          {email    && <a href={`mailto:${email}`}    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-all" style={{ background: accent }}><Mail className="w-4 h-4" /> {email}</a>}
          {phone    && <a href={`tel:${phone}`}        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white/80 border border-white/20 bg-white/5 hover:bg-white/10 transition-all"><span>📞</span> {phone}</a>}
          {location && <div className="flex items-center justify-center gap-2 text-sm text-white/50"><span>📍</span> {location}</div>}
          {address  && <div className="flex items-center justify-center gap-2 text-sm text-white/40"><span>🏢</span> {address}</div>}
        </div>
      </div>
    </section>
  );
}

function SocialSection({ config, accent }: { config: Record<string,string>; accent: string }) {
  const links = [
    { key: "_social_twitter",  label: "Twitter",  Icon: Twitter, url: (v: string) => `https://twitter.com/${v.replace("@","")}` },
    { key: "_social_telegram", label: "Telegram", Icon: MessageCircle, url: (v: string) => v.startsWith("http") ? v : `https://t.me/${v}` },
    { key: "_social_discord",  label: "Discord",  Icon: Users, url: (v: string) => v.startsWith("http") ? v : `https://discord.gg/${v}` },
    { key: "_social_github",   label: "GitHub",   Icon: Github, url: (v: string) => v.startsWith("http") ? v : `https://github.com/${v}` },
    { key: "website",          label: "Website",  Icon: Globe, url: (v: string) => v },
  ].filter(l => !!config[l.key]);
  if (!links.length) return null;
  const rgb = hexToRgb(accent);
  return (
    <section className="py-12 px-4">
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-lg font-bold text-white mb-6">Follow Us</h2>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {links.map(({ key, label, Icon, url }) => (
            <a key={key} href={url(config[key])} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium">
              <Icon className="w-4 h-4" style={{ color: accent }} /> {label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatsAppFloat({ number }: { number: string }) {
  if (!number) return null;
  const clean = number.replace(/\D/g, "");
  return (
    <a href={`https://wa.me/${clean}`} target="_blank" rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110"
      style={{ background: "#25D366" }}>
      <MessageCircle className="w-7 h-7 text-white fill-white" />
    </a>
  );
}

function SiteFooter({ name, accent }: { name: string; accent: string }) {
  return (
    <footer className="border-t border-white/10 py-8 px-4 text-center">
      <p className="text-xs text-white/30">
        {name} · Powered by <a href="https://block67.app" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors" style={{ color: accent }}>Block67</a>
      </p>
    </footer>
  );
}

function SiteSections({ config, accent }: { config: Record<string,string>; accent: string }) {
  const sections = (config._sections || "").split(",").map(s => s.trim()).filter(Boolean);
  return (
    <>
      {sections.includes("team")     && config._team_json    && <TeamSection    json={config._team_json}    accent={accent} />}
      {sections.includes("faq")      && config._faq_json     && <FaqSection     json={config._faq_json}     accent={accent} />}
      {sections.includes("contact")  && <ContactSection config={config} accent={accent} />}
      {sections.includes("social")   && <SocialSection config={config} accent={accent} />}
    </>
  );
}

// ── Wallet Hook ───────────────────────────────────────────────────────────────

function useWallet(requiredChainId: number, projectSlug: string) {
  const [wallet, setWallet] = useState<WalletState>({ address: "", chainId: null, connected: false });
  const [error,  setError]  = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const onAccounts = (accs: string[]) => setWallet((w) => ({ ...w, address: accs[0] ?? "", connected: !!accs[0] }));
    const onChain    = (c: string)      => setWallet((w) => ({ ...w, chainId: parseInt(c, 16) }));
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged",    onChain);
    window.ethereum.request({ method: "eth_accounts" }).then((accs: string[]) => {
      if (accs[0]) {
        window.ethereum.request({ method: "eth_chainId" }).then((c: string) =>
          setWallet({ address: accs[0], chainId: parseInt(c, 16), connected: true })
        );
      }
    });
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    setError("");
    if (typeof window === "undefined") return;
    if (!window.ethereum) {
      // Mobile: deep-link into MetaMask's in-app browser where window.ethereum is injected
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = `https://metamask.app.link/dapp/${window.location.href.replace(/^https?:\/\//, "")}`;
        return;
      }
      setError("MetaMask not found. Install it at metamask.io.");
      return;
    }
    try {
      const accs: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      const chainHex: string = await window.ethereum.request({ method: "eth_chainId" });
      setWallet({ address: accs[0] ?? "", chainId: parseInt(chainHex, 16), connected: !!accs[0] });
      // Record this wallet connection in the DB (fire-and-forget)
      if (accs[0] && projectSlug) {
        fetch(`/api/site/${projectSlug}/connect`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ walletAddress: accs[0] }),
        }).catch(() => {/* non-critical */});
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  }, [projectSlug]);

  const switchChain = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${requiredChainId.toString(16)}` }],
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chain switch failed");
    }
  }, [requiredChainId]);

  const onWrongChain = wallet.connected && wallet.chainId !== null && wallet.chainId !== requiredChainId;

  return { wallet, error, connect, switchChain, onWrongChain };
}

// ── ERC-20 / Meme Token dApp ──────────────────────────────────────────────────

function ERC20DApp({ d, config, projectSlug, templateKey }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string; templateKey?: string }) {
  const isMeme = templateKey === "meme-token" || config._templateKey === "meme-token";
  const abi    = (d.contractAbi as string[] | null) ?? ERC20_ABI;
  const { wallet, error: wErr, connect, switchChain, onWrongChain } = useWallet(d.evmChainId, projectSlug);

  const [loading,   setLoading]   = useState(true);
  const [info,      setInfo]      = useState({ name: config.tokenName || "Token", symbol: config.symbol || "TKN", supply: "0", decimals: 18, owner: "" });
  const [balance,   setBalance]   = useState("");
  const [taxBps,    setTaxBps]    = useState<number | null>(null);
  const [isPaused,  setIsPaused]  = useState<boolean | null>(null);
  const [maxTx,     setMaxTx]     = useState<string | null>(null);
  const [toast,     setToast]     = useState({ msg: "", ok: true });
  const [tx,        setTx]        = useState("");
  const [toAddr,    setToAddr]    = useState("");
  const [amount,    setAmount]    = useState("");
  const [mintTo,    setMintTo]    = useState("");
  const [mintAmt,   setMintAmt]   = useState("");
  const [blAddr,    setBlAddr]    = useState("");
  const [blBlocked, setBlBlocked] = useState(true);
  const [busy,      setBusy]      = useState(false);
  const [copied,    setCopied]    = useState(false);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: "", ok: true }), 5000); };

  const loadInfo = useCallback(async () => {
    try {
      const provider   = await mkReadProvider(d.rpcUrl, wallet.connected);
      const { ethers } = await import("ethers");
      const contract   = new ethers.Contract(d.contractAddress, abi, provider);
      const [name, symbol, decimals, supply, owner] = await Promise.all([
        contract.name().catch(() => config.tokenName || "Token"),
        contract.symbol().catch(() => config.symbol || "TKN"),
        contract.decimals().catch(() => 18),
        contract.totalSupply().catch(() => 0n),
        contract.owner().catch(() => ""),
      ]);
      const tax    = await contract.taxBps().catch(() => null);
      const paused = await contract.paused().catch(() => null);
      const maxTxRaw = await contract.maxTxAmount().catch(() => null);
      setInfo({ name, symbol, supply: fmtUnits(supply, Number(decimals), 2), decimals: Number(decimals), owner });
      if (tax    !== null) setTaxBps(Number(tax));
      if (paused !== null) setIsPaused(Boolean(paused));
      if (maxTxRaw !== null) setMaxTx(fmtUnits(maxTxRaw, Number(decimals), 0));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [d, abi, config, wallet.connected]);

  const loadBalance = useCallback(async () => {
    if (!wallet.connected) return;
    try {
      const { ethers } = await import("ethers");
      const provider   = await mkReadProvider(d.rpcUrl, true);
      const contract   = new ethers.Contract(d.contractAddress, abi, provider);
      const bal: bigint = await contract.balanceOf(wallet.address);
      setBalance(fmtUnits(bal, info.decimals));
    } catch (e) {
      setBalance("—");
      console.warn("[balance]", e);
    }
  }, [wallet, d, abi, info.decimals]);

  useEffect(() => { loadInfo(); }, [loadInfo]);
  useEffect(() => { loadBalance(); }, [loadBalance]);

  const transfer = async () => {
    if (!toAddr || !amount) return;
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.transfer(toAddr, parseUnits(amount, info.decimals))).wait();
      setTx(receipt?.hash ?? "");
      showToast(`Sent ${amount} ${info.symbol} successfully!`, true);
      setToAddr(""); setAmount("");
      loadBalance();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transfer failed";
      if (msg.includes("blacklisted")) showToast("Address is blacklisted — transfer blocked by contract.", false);
      else if (msg.includes("paused"))  showToast("Token transfers are paused. Try again later.", false);
      else if (msg.includes("max tx") || msg.includes("Exceeds max")) showToast(`Exceeds max tx limit (${maxTx} ${info.symbol}).`, false);
      else if (msg.includes("gas"))     showToast("Not enough gas. Make sure you have enough ETH for fees.", false);
      else showToast(msg.slice(0, 120), false);
    } finally { setBusy(false); }
  };

  const mintTokens = async () => {
    if (!mintTo || !mintAmt) return;
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.mint(mintTo, parseUnits(mintAmt, info.decimals))).wait();
      setTx(receipt?.hash ?? "");
      showToast(`Minted ${mintAmt} ${info.symbol}!`, true);
      setMintTo(""); setMintAmt("");
      loadInfo(); loadBalance();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message.slice(0, 120) : "Mint failed", false);
    } finally { setBusy(false); }
  };

  const togglePause = async () => {
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await (isPaused ? contract.unpause() : contract.pause())).wait();
      setTx(receipt?.hash ?? "");
      showToast(isPaused ? "Token unpaused — transfers re-enabled." : "Token paused — all transfers blocked.", true);
      setIsPaused(!isPaused);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message.slice(0, 120) : "Failed", false);
    } finally { setBusy(false); }
  };

  const setBlacklist = async () => {
    if (!blAddr) return;
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.setBlacklist(blAddr, blBlocked)).wait();
      setTx(receipt?.hash ?? "");
      showToast(`Address ${blBlocked ? "blacklisted" : "removed from blacklist"}.`, true);
      setBlAddr("");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message.slice(0, 120) : "Failed", false);
    } finally { setBusy(false); }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tweetLink = () => {
    const text = encodeURIComponent(`Just launched ${info.name} ($${info.symbol}) on ${d.chainName}! Built with @block67app 🚀`);
    const url  = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const isOwner    = wallet.connected && info.owner && wallet.address.toLowerCase() === info.owner.toLowerCase();
  const isMintable = config.mintable === "true" || isMeme;
  const hasPause   = isPaused !== null;
  const showBlacklist = true; // always show to owner — tx fails gracefully if contract doesn't support it

  const accent = getAccent(config);
  const bg     = getBg(config);
  const rgb    = hexToRgb(accent);
  const desc   = config.description || config.tokenDescription || "";

  return (
    <div className="min-h-screen" style={{ background: bg, color: "#fff" }}>
      <SiteNav name={info.name} symbol={info.symbol} chainName={d.chainName} accent={accent}
        wallet={wallet} connect={connect} onWrongChain={onWrongChain} switchChain={switchChain} />

      <SiteHero name={info.name} symbol={info.symbol} description={desc} accent={accent} config={config}
        connect={connect} walletConnected={wallet.connected} />

      <div className="max-w-2xl mx-auto px-4 pb-6 space-y-4">
        {loading && <div className="flex items-center gap-2 text-sm text-white/40"><Loader2 className="w-4 h-4 animate-spin" /> Loading contract data…</div>}
        {wErr && <Toast msg={wErr} ok={false} />}
        <Toast msg={toast.msg} ok={toast.ok} />

        {/* ── Token Live Banner ── */}
        {!loading && (
          <div className="rounded-2xl p-4 border" style={{ background: `rgba(${rgb},0.08)`, borderColor: `rgba(${rgb},0.3)` }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Token is Live</span>
                  {isPaused && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-400 border border-amber-700/40">Paused</span>}
                </div>
                <p className="text-white font-bold text-lg">{info.name} <span className="text-white/50 font-normal text-base">${info.symbol}</span></p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-white/50 font-mono">{shortenAddress(d.contractAddress)}</span>
                  <CopyBtn text={d.contractAddress} />
                  <a href={`${d.explorerUrl}/address/${d.contractAddress}`} target="_blank" rel="noopener noreferrer"
                    className="text-white/30 hover:text-white/70 flex items-center gap-1 text-xs">
                    <ExternalLink className="w-3 h-3" /> Explorer
                  </a>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={copyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:text-white rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all">
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Share"}
                </button>
                <button onClick={tweetLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:text-white rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all">
                  <Twitter className="w-3.5 h-3.5" /> Tweet
                </button>
              </div>
            </div>
            {/* Trust indicators */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10 flex-wrap">
              <span className="text-[11px] text-white/30 flex items-center gap-1">🛡 Powered by OpenZeppelin</span>
              <span className="text-[11px] text-white/30">· {d.chainName}</span>
              {taxBps !== null && <span className="text-[11px] text-white/30">· {taxBps / 100}% tax</span>}
              {maxTx  !== null && <span className="text-[11px] text-white/30">· Max tx: {maxTx} {info.symbol}</span>}
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 gap-3">
          <GlassCard accent={accent}>
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Total Supply</p>
            <p className="font-bold text-white">{info.supply} <span className="text-white/40 font-normal text-xs">{info.symbol}</span></p>
          </GlassCard>
          <GlassCard accent={accent}>
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Network</p>
            <p className="font-semibold text-white text-sm">{d.chainName}</p>
            <p className="text-[11px] text-white/40 mt-0.5 font-mono">{shortenAddress(d.contractAddress)}</p>
          </GlassCard>
        </div>

        {/* ── Balance ── */}
        {wallet.connected && (
          <GlassCard accent={accent}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-white/40 uppercase tracking-wider">Your Balance</p>
              <button onClick={loadBalance} className="text-white/30 hover:text-white/70 transition-colors"><RefreshCw className="w-3 h-3" /></button>
            </div>
            {balance === "" ? (
              <div className="flex items-center gap-2 text-white/30 text-sm"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</div>
            ) : (
              <p className="text-2xl font-bold text-white">{balance} <span className="text-base font-normal text-white/40">{info.symbol}</span></p>
            )}
            <p className="text-xs text-white/30 font-mono mt-1">{shortenAddress(wallet.address)}</p>
            {onWrongChain && (
              <p className="text-xs text-amber-400 mt-1.5">⚠ Switch to {d.chainName} to see live balance</p>
            )}
          </GlassCard>
        )}

        {/* ── Transfer ── */}
        {wallet.connected && !onWrongChain && (
          <GlassCard accent={accent} className="space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-1.5"><Send className="w-4 h-4" style={{ color: accent }} /> Transfer</h3>
            {isPaused && <p className="text-xs text-amber-400 bg-amber-900/30 rounded-lg px-3 py-2">⚠ Transfers are currently paused by the contract owner.</p>}
            <input value={toAddr} onChange={(e) => setToAddr(e.target.value)} placeholder="Recipient address (0x…)"
              className="w-full text-sm rounded-xl px-3 py-2.5 outline-none font-mono bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-white/30" />
            <div className="flex gap-2">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Amount (${info.symbol})`}
                className="flex-1 text-sm rounded-xl px-3 py-2.5 outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-white/30" />
              <button onClick={transfer} disabled={busy || !toAddr || !amount || !!isPaused}
                className="px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all hover:opacity-90 disabled:opacity-30 flex items-center gap-1.5"
                style={{ background: accent }}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send
              </button>
            </div>
            {maxTx !== null && (
              <p className="text-[11px] text-white/30">Max per transaction: {maxTx} {info.symbol}</p>
            )}
          </GlassCard>
        )}

        {/* ── Mint (owner only) ── */}
        {wallet.connected && !onWrongChain && isOwner && isMintable && (
          <GlassCard accent={accent} className="space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
              <Zap className="w-4 h-4" style={{ color: accent }} /> Mint Tokens
              <span className="text-[11px] px-1.5 py-0.5 rounded-full border border-white/20 bg-white/10 text-white/60">Owner only</span>
            </h3>
            <input value={mintTo} onChange={(e) => setMintTo(e.target.value)} placeholder="Recipient address"
              className="w-full text-sm rounded-xl px-3 py-2.5 outline-none font-mono bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-white/30" />
            <div className="flex gap-2">
              <input value={mintAmt} onChange={(e) => setMintAmt(e.target.value)} placeholder="Amount to mint"
                className="flex-1 text-sm rounded-xl px-3 py-2.5 outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-white/30" />
              <button onClick={mintTokens} disabled={busy || !mintTo || !mintAmt}
                className="px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all hover:opacity-90 disabled:opacity-30 flex items-center gap-1.5"
                style={{ background: `rgba(${rgb},0.3)`, border: `1px solid rgba(${rgb},0.5)` }}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Mint
              </button>
            </div>
          </GlassCard>
        )}

        {/* ── Owner Admin Panel ── */}
        {wallet.connected && !onWrongChain && isOwner && (hasPause || showBlacklist) && !loading && (
          <GlassCard accent={accent} className="space-y-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
              🔐 Owner Controls
              <span className="text-[11px] px-1.5 py-0.5 rounded-full border border-white/20 bg-white/10 text-white/60">Admin only</span>
            </h3>

            {/* Pause / Unpause */}
            {hasPause && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm text-white font-medium">{isPaused ? "Token is Paused" : "Token is Active"}</p>
                  <p className="text-xs text-white/40 mt-0.5">{isPaused ? "All transfers are blocked" : "Transfers are enabled"}</p>
                </div>
                <button onClick={togglePause} disabled={busy}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-xl transition-all disabled:opacity-30 ${isPaused ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"}`}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isPaused ? "Unpause" : "Pause"}
                </button>
              </div>
            )}

            {/* Blacklist management */}
            {showBlacklist && (
              <div className="space-y-2">
                <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Blacklist Management</p>
                <input value={blAddr} onChange={(e) => setBlAddr(e.target.value)} placeholder="Address to block/unblock (0x…)"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none font-mono bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-white/30" />
                <div className="flex gap-2">
                  <select value={blBlocked ? "block" : "unblock"} onChange={(e) => setBlBlocked(e.target.value === "block")}
                    className="flex-1 text-sm rounded-xl px-3 py-2.5 outline-none bg-white/5 border border-white/15 text-white focus:border-white/30">
                    <option value="block">Block address</option>
                    <option value="unblock">Unblock address</option>
                  </select>
                  <button onClick={setBlacklist} disabled={busy || !blAddr}
                    className="px-4 py-2.5 text-white text-xs font-semibold rounded-xl transition-all hover:opacity-90 disabled:opacity-30 bg-red-700 hover:bg-red-600">
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {/* ── Next Steps (for owner) ── */}
        {isOwner && !loading && (
          <GlassCard accent={accent}>
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3">Next Steps</p>
            <div className="space-y-2">
              {[
                { icon: "🔍", label: "Verify on block explorer", href: `${d.explorerUrl}/address/${d.contractAddress}#code`, desc: "Make your source code public & trustworthy" },
                { icon: "🦊", label: "Add to MetaMask", href: null, desc: `Token address: ${shortenAddress(d.contractAddress)}` },
                { icon: "📤", label: "Share your token page", href: null, desc: "Share this page URL with your community" },
                { icon: "💧", label: "Add liquidity on DEX", href: "https://app.uniswap.org", desc: "List on Uniswap, SushiSwap, or PancakeSwap" },
              ].map((step) => (
                <div key={step.label} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                  <span className="text-base mt-0.5">{step.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-white font-medium">{step.label}</span>
                      {step.href && (
                        <a href={step.href} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 text-white/30 hover:text-white/60" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {tx && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <TxLink hash={tx} explorerUrl={d.explorerUrl} accent={accent} />
          </div>
        )}
        {!wallet.connected && <ConnectPrompt connect={connect} accent={accent} />}
        <ContractInfo d={d} accent={accent} />
      </div>

      <SiteSections config={config} accent={accent} />
      <SocialSection config={config} accent={accent} />
      <SiteFooter name={info.name} accent={accent} />
      <WhatsAppFloat number={config._whatsapp || ""} />
    </div>
  );
}

// ── NFT Mint dApp ─────────────────────────────────────────────────────────────

function NFTDApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string; templateKey?: string }) {
  const abi = (d.contractAbi as string[] | null) ?? ERC721_ABI;
  const { wallet, error: wErr, connect, switchChain, onWrongChain } = useWallet(d.evmChainId, projectSlug);

  const [loading,    setLoading]    = useState(true);
  const [info,       setInfo]       = useState({ name: config.collectionName || "NFT", symbol: config.symbol || "NFT", maxSupply: 0n, mintPrice: 0n, minted: 0n, saleActive: false, owner: "" });
  const [balance,    setBalance]    = useState(0n);
  const [qty,        setQty]        = useState(1);
  const [toast,      setToast]      = useState({ msg: "", ok: true });
  const [tx,         setTx]         = useState("");
  const [busy,       setBusy]       = useState(false);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: "", ok: true }), 5000); };

  const loadInfo = useCallback(async () => {
    try {
      const { ethers } = await import("ethers");
      const provider   = await mkReadProvider(d.rpcUrl, wallet.connected);
      const contract   = new ethers.Contract(d.contractAddress, abi, provider);
      const [name, symbol, maxSupply, mintPrice, owner] = await Promise.all([
        contract.name().catch(() => config.collectionName || "NFT"),
        contract.symbol().catch(() => config.symbol || "NFT"),
        contract.MAX_SUPPLY().catch(() => BigInt(config.maxSupply || "10000")),
        contract.MINT_PRICE().catch(() => { try { return BigInt(Math.round(parseFloat(config.mintPrice || "0.05") * 1e18)); } catch { return 0n; } }),
        contract.owner().catch(() => ""),
      ]);
      const minted  = await contract.totalMinted().catch(() => contract.totalSupply().catch(() => 0n));
      const saleActive = await contract.saleActive().catch(() => contract.publicMint().catch(() => false));
      setInfo({ name, symbol, maxSupply, mintPrice, minted, saleActive, owner });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [d, abi, config, wallet.connected]);

  const loadBalance = useCallback(async () => {
    if (!wallet.connected) return;
    try {
      const { ethers } = await import("ethers");
      const provider   = await mkReadProvider(d.rpcUrl, true);
      const contract   = new ethers.Contract(d.contractAddress, abi, provider);
      const bal = await contract.balanceOf(wallet.address);
      setBalance(bal);
    } catch (e) { console.warn("[nft balance]", e); }
  }, [wallet, d, abi]);

  useEffect(() => { loadInfo(); }, [loadInfo]);
  useEffect(() => { loadBalance(); }, [loadBalance]);

  const mintNFT = async () => {
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const value      = info.mintPrice * BigInt(qty);
      const receipt    = await (await contract.mint(qty, { value })).wait();
      setTx(receipt?.hash ?? "");
      showToast(`Minted ${qty} NFT${qty > 1 ? "s" : ""}! Check your wallet.`, true);
      loadInfo(); loadBalance();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(msg.includes("user rejected") ? "Transaction rejected." : msg.slice(0, 100), false);
    } finally { setBusy(false); }
  };

  const toggleSale = async () => {
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      await (await (contract.setSaleActive ?? contract.setPublicMint)(!info.saleActive)).wait();
      showToast(`Sale ${info.saleActive ? "paused" : "activated"}!`, true);
      loadInfo();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 100) : "Failed", false); }
    finally { setBusy(false); }
  };

  const pct      = info.maxSupply > 0n ? Number((info.minted * 100n) / info.maxSupply) : 0;
  const ethPrice = fmtUnits(info.mintPrice, 18, 4);
  const totalCost = fmtUnits(info.mintPrice * BigInt(qty), 18, 4);
  const isOwner   = wallet.connected && info.owner && wallet.address.toLowerCase() === info.owner.toLowerCase();

  const accent = getAccent(config);
  const bg     = getBg(config);
  const rgb    = hexToRgb(accent);
  const desc   = config.description || config.collectionDescription || "";

  return (
    <div className="min-h-screen" style={{ background: bg, color: "#fff" }}>
      <SiteNav name={info.name} symbol={info.symbol} chainName={d.chainName} accent={accent}
        wallet={wallet} connect={connect} onWrongChain={onWrongChain} switchChain={switchChain} />

      <SiteHero name={info.name} symbol={info.symbol} description={desc} accent={accent} config={config}
        connect={connect} walletConnected={wallet.connected} />

      <div className="max-w-2xl mx-auto px-4 pb-6 space-y-4">
        {loading && <div className="flex items-center gap-2 text-sm text-white/40"><Loader2 className="w-4 h-4 animate-spin" />Loading collection…</div>}
        {wErr && <Toast msg={wErr} ok={false} />}
        <Toast msg={toast.msg} ok={toast.ok} />

        {/* Supply progress */}
        <GlassCard accent={accent}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-white text-lg">{info.minted.toString()} <span className="text-white/40 font-normal text-sm">/ {info.maxSupply.toString()} minted</span></p>
              <p className="text-xs text-white/40 mt-0.5">{pct}% claimed</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-white/40 uppercase tracking-wider mb-0.5">Mint Price</p>
              <p className="font-bold text-white">{ethPrice} {d.nativeCurrency}</p>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, rgba(${rgb},0.5))` }} />
          </div>
          {info.saleActive
            ? <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Mint is live</div>
            : <div className="mt-3 text-xs text-white/30">Mint is paused</div>
          }
        </GlassCard>

        {/* Your NFTs */}
        {wallet.connected && (
          <GlassCard accent={accent} className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Your NFTs</p>
              <p className="text-2xl font-bold text-white">{balance.toString()}</p>
            </div>
            <button onClick={loadBalance} className="text-white/30 hover:text-white/70"><RefreshCw className="w-4 h-4" /></button>
          </GlassCard>
        )}

        {/* Mint card */}
        {wallet.connected && !onWrongChain ? (
          <GlassCard accent={accent} className="space-y-4">
            <h3 className="font-semibold text-white text-sm">Mint NFT</h3>
            {!info.saleActive && !isOwner && (
              <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" /> Sale is not active yet
              </div>
            )}
            <div className="flex items-center gap-3">
              <p className="text-sm text-white/60 flex-1">Quantity</p>
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white font-bold">−</button>
                <span className="w-6 text-center text-sm font-bold text-white">{qty}</span>
                <button onClick={() => setQty(Math.min(10, qty + 1))} className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white font-bold">+</button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Total cost</span>
              <span className="font-bold text-white">{totalCost} {d.nativeCurrency}</span>
            </div>
            <button onClick={mintNFT} disabled={busy || !info.saleActive}
              className="w-full py-3 font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2 text-white"
              style={{ background: `linear-gradient(135deg, ${accent}, rgba(${rgb},0.6))`, boxShadow: `0 0 20px rgba(${rgb},0.3)` }}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {busy ? "Minting…" : `Mint ${qty} NFT${qty > 1 ? "s" : ""}`}
            </button>
          </GlassCard>
        ) : !wallet.connected ? (
          <ConnectPrompt connect={connect} accent={accent} />
        ) : null}

        {/* Owner controls */}
        {isOwner && (
          <GlassCard accent={accent} className="space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
              <Zap className="w-4 h-4" style={{ color: accent }} /> Owner Controls
            </h3>
            <button onClick={toggleSale} disabled={busy}
              className={`w-full py-2.5 text-sm font-semibold rounded-xl border transition-all ${info.saleActive ? "border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20" : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"}`}>
              {info.saleActive ? "⏸ Pause Sale" : "▶ Activate Sale"}
            </button>
          </GlassCard>
        )}

        {tx && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><TxLink hash={tx} explorerUrl={d.explorerUrl} accent={accent} /></div>}
        <ContractInfo d={d} accent={accent} />
      </div>

      <SiteSections config={config} accent={accent} />
      <SocialSection config={config} accent={accent} />
      <SiteFooter name={info.name} accent={accent} />
      <WhatsAppFloat number={config._whatsapp || ""} />
    </div>
  );
}

// ── DAO Governance dApp ───────────────────────────────────────────────────────

function DAODApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string; templateKey?: string }) {
  const abi = (d.contractAbi as string[] | null) ?? DAO_ABI;
  const { wallet, error: wErr, connect, switchChain, onWrongChain } = useWallet(d.evmChainId, projectSlug);

  const [loading,  setLoading]  = useState(true);
  const [info,     setInfo]     = useState({ name: config.daoName || "DAO", symbol: config.tokenName || "GOV", supply: "0", owner: "" });
  const [balance,  setBalance]  = useState("0");
  const [delegate, setDelegate] = useState("");
  const [delTo,    setDelTo]    = useState("");
  const [toast,    setToast]    = useState({ msg: "", ok: true });
  const [tx,       setTx]       = useState("");
  const [busy,     setBusy]     = useState(false);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: "", ok: true }), 5000); };

  useEffect(() => {
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = await mkReadProvider(d.rpcUrl, wallet.connected);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        const [name, symbol, supply, owner] = await Promise.all([
          contract.name().catch(() => config.daoName || "DAO Token"),
          contract.symbol().catch(() => config.tokenName || "GOV"),
          contract.totalSupply().catch(() => 0n),
          contract.owner().catch(() => ""),
        ]);
        setInfo({ name, symbol, supply: fmtUnits(supply, 18, 2), owner });
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [d, abi, config, wallet.connected]);

  useEffect(() => {
    if (!wallet.connected) return;
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = await mkReadProvider(d.rpcUrl, true);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        const [bal, del] = await Promise.all([
          contract.balanceOf(wallet.address).catch(() => 0n),
          contract.delegates(wallet.address).catch(() => ""),
        ]);
        setBalance(fmtUnits(bal, 18, 2));
        setDelegate(del);
      } catch (e) { console.warn("[dao balance]", e); }
    })();
  }, [wallet, d, abi]);

  const doDelegate = async () => {
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.delegate(delTo || wallet.address)).wait();
      setTx(receipt?.hash ?? "");
      showToast("Delegation updated!", true);
      setDelegate(delTo || wallet.address);
      setDelTo("");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 100) : "Failed", false); }
    finally { setBusy(false); }
  };

  const accent = getAccent(config);
  const bg     = getBg(config);
  const rgb    = hexToRgb(accent);
  const desc   = config.description || config.daoDescription || "";

  return (
    <div className="min-h-screen" style={{ background: bg, color: "#fff" }}>
      <SiteNav name={info.name} symbol={info.symbol} chainName={d.chainName} accent={accent}
        wallet={wallet} connect={connect} onWrongChain={onWrongChain} switchChain={switchChain} />

      <SiteHero name={info.name} symbol={`${info.symbol} Governance`} description={desc} accent={accent} config={config}
        connect={connect} walletConnected={wallet.connected} />

      <div className="max-w-2xl mx-auto px-4 pb-6 space-y-4">
        {loading && <div className="flex items-center gap-2 text-sm text-white/40"><Loader2 className="w-4 h-4 animate-spin" />Loading DAO…</div>}
        {wErr && <Toast msg={wErr} ok={false} />}
        <Toast msg={toast.msg} ok={toast.ok} />

        <div className="grid grid-cols-2 gap-3">
          <GlassCard accent={accent}>
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Token Supply</p>
            <p className="font-bold text-white">{info.supply} <span className="text-white/40 font-normal text-xs">{info.symbol}</span></p>
          </GlassCard>
          <GlassCard accent={accent}>
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Quorum</p>
            <p className="font-bold text-white">{config.quorum || "4"}%</p>
          </GlassCard>
        </div>

        {wallet.connected && (
          <GlassCard accent={accent} className="space-y-2">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Your Voting Power</p>
            <p className="text-2xl font-bold text-white">{balance} <span className="text-base font-normal text-white/40">{info.symbol}</span></p>
            {delegate && <p className="text-xs text-white/30">Delegated to: <span className="font-mono text-white/50">{shortenAddress(delegate)}</span></p>}
          </GlassCard>
        )}

        {wallet.connected && !onWrongChain && (
          <GlassCard accent={accent} className="space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-1.5"><Vote className="w-4 h-4" style={{ color: accent }} /> Delegate Votes</h3>
            <p className="text-xs text-white/40">Delegate your voting power to yourself or another address to participate in governance.</p>
            <input value={delTo} onChange={(e) => setDelTo(e.target.value)} placeholder="Leave empty to self-delegate"
              className="w-full text-sm rounded-xl px-3 py-2.5 outline-none font-mono bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-white/30" />
            <button onClick={doDelegate} disabled={busy}
              className="w-full py-3 font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2 text-white"
              style={{ background: accent }}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Vote className="w-4 h-4" />}
              {busy ? "Delegating…" : "Delegate Votes"}
            </button>
          </GlassCard>
        )}

        {!wallet.connected && <ConnectPrompt connect={connect} accent={accent} />}
        {tx && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><TxLink hash={tx} explorerUrl={d.explorerUrl} accent={accent} /></div>}
        <ContractInfo d={d} accent={accent} />
      </div>

      <SiteSections config={config} accent={accent} />
      <SocialSection config={config} accent={accent} />
      <SiteFooter name={info.name} accent={accent} />
      <WhatsAppFloat number={config._whatsapp || ""} />
    </div>
  );
}

// ── Staking dApp ──────────────────────────────────────────────────────────────

function StakingDApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string; templateKey?: string }) {
  const abi = (d.contractAbi as string[] | null) ?? STAKING_ABI;
  const { wallet, error: wErr, connect, switchChain, onWrongChain } = useWallet(d.evmChainId, projectSlug);

  const [loading,  setLoading]  = useState(true);
  const [info,     setInfo]     = useState({ apyBps: 0, lockSecs: 0, totalStaked: "0" });
  const [position, setPosition] = useState({ staked: "0", earned: "0", stakedAt: 0 });
  const [stakeAmt, setStakeAmt] = useState("");
  const [toast,    setToast]    = useState({ msg: "", ok: true });
  const [tx,       setTx]       = useState("");
  const [busy,     setBusy]     = useState(false);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: "", ok: true }), 5000); };

  useEffect(() => {
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = await mkReadProvider(d.rpcUrl, wallet.connected);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        const [apy, lock, total] = await Promise.all([
          contract.APY_BPS().catch(() => BigInt(Math.round(Number(config.apy || 12) * 100))),
          contract.LOCK_SECS().catch(() => BigInt(Number(config.lockDays || 30) * 86400)),
          contract.totalStaked().catch(() => 0n),
        ]);
        setInfo({ apyBps: Number(apy), lockSecs: Number(lock), totalStaked: fmtUnits(total, 18, 2) });
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [d, abi, config, wallet.connected]);

  useEffect(() => {
    if (!wallet.connected) return;
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = await mkReadProvider(d.rpcUrl, true);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        const [staked, earned, stakedAt] = await Promise.all([
          contract.staked(wallet.address).catch(() => 0n),
          contract.earned(wallet.address).catch(() => 0n),
          contract.stakedAt(wallet.address).catch(() => 0n),
        ]);
        setPosition({ staked: fmtUnits(staked, 18, 4), earned: fmtUnits(earned, 18, 6), stakedAt: Number(stakedAt) });
      } catch (e) { console.warn("[staking position]", e); }
    })();
  }, [wallet, d, abi]);

  const lockDays   = Math.round(info.lockSecs / 86400);
  const apy        = (info.apyBps / 100).toFixed(1);
  const unlockDate = position.stakedAt > 0 ? new Date((position.stakedAt + info.lockSecs) * 1000) : null;
  const isUnlocked = unlockDate ? new Date() >= unlockDate : false;

  const doStake = async () => {
    if (!stakeAmt) return;
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      // Note: staking requires prior approval of the stakeToken — handled by the contract itself
      const receipt    = await (await contract.stake(parseUnits(stakeAmt))).wait();
      setTx(receipt?.hash ?? "");
      showToast(`Staked ${stakeAmt} tokens!`, true);
      setStakeAmt("");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 120) : "Stake failed", false); }
    finally { setBusy(false); }
  };

  const doClaim = async () => {
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.claimReward()).wait();
      setTx(receipt?.hash ?? "");
      showToast("Rewards claimed!", true);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 120) : "Claim failed", false); }
    finally { setBusy(false); }
  };

  const doUnstake = async () => {
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.unstake(parseUnits(position.staked))).wait();
      setTx(receipt?.hash ?? "");
      showToast("Unstaked successfully!", true);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 120) : "Unstake failed", false); }
    finally { setBusy(false); }
  };

  const accent = getAccent(config);
  const bg     = getBg(config);
  const rgb    = hexToRgb(accent);
  const desc   = config.description || config.stakingDescription || "";
  const stakingName = config.tokenName || "Staking";

  return (
    <div className="min-h-screen" style={{ background: bg, color: "#fff" }}>
      <SiteNav name={`${stakingName} Pool`} symbol={`${apy}% APY`} chainName={d.chainName} accent={accent}
        wallet={wallet} connect={connect} onWrongChain={onWrongChain} switchChain={switchChain} />

      <SiteHero name={`${stakingName} Pool`} symbol={`${apy}% APY`} description={desc} accent={accent} config={config}
        connect={connect} walletConnected={wallet.connected} />

      <div className="max-w-2xl mx-auto px-4 pb-6 space-y-4">
        {loading && <div className="flex items-center gap-2 text-sm text-white/40"><Loader2 className="w-4 h-4 animate-spin" />Loading pool…</div>}
        {wErr && <Toast msg={wErr} ok={false} />}
        <Toast msg={toast.msg} ok={toast.ok} />

        <div className="grid grid-cols-3 gap-3">
          <GlassCard accent={accent} className="text-center">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">APY</p>
            <p className="font-bold text-lg" style={{ color: accent }}>{apy}%</p>
          </GlassCard>
          <GlassCard accent={accent} className="text-center">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Lock</p>
            <p className="font-bold text-white">{lockDays}d</p>
          </GlassCard>
          <GlassCard accent={accent} className="text-center">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">TVL</p>
            <p className="font-bold text-white text-xs">{info.totalStaked}</p>
          </GlassCard>
        </div>

        {wallet.connected && (
          <GlassCard accent={accent} className="space-y-3">
            <h3 className="font-semibold text-white text-sm">Your Position</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[11px] text-white/40 uppercase tracking-wider mb-0.5">Staked</p><p className="font-bold text-white">{position.staked}</p></div>
              <div><p className="text-[11px] text-white/40 uppercase tracking-wider mb-0.5">Rewards</p><p className="font-bold text-emerald-400">{position.earned}</p></div>
            </div>
            {unlockDate && <p className="text-xs text-white/30">Unlocks: {unlockDate.toLocaleDateString()}</p>}
            <div className="flex gap-2 pt-1">
              {parseFloat(position.earned) > 0 && (
                <button onClick={doClaim} disabled={busy}
                  className="flex-1 py-2.5 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-400 text-sm font-semibold rounded-xl transition-all disabled:opacity-30 flex items-center justify-center gap-1.5">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />} Claim Rewards
                </button>
              )}
              {parseFloat(position.staked) > 0 && isUnlocked && (
                <button onClick={doUnstake} disabled={busy}
                  className="flex-1 py-2.5 bg-white/5 border border-white/20 hover:bg-white/10 text-white/70 text-sm font-semibold rounded-xl transition-all disabled:opacity-30 flex items-center justify-center gap-1.5">
                  Unstake
                </button>
              )}
            </div>
          </GlassCard>
        )}

        {wallet.connected && !onWrongChain && (
          <GlassCard accent={accent} className="space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-1.5"><TrendingUp className="w-4 h-4" style={{ color: accent }} /> Stake Tokens</h3>
            <div className="flex gap-2">
              <input value={stakeAmt} onChange={(e) => setStakeAmt(e.target.value)} placeholder="Amount to stake"
                className="flex-1 text-sm rounded-xl px-3 py-2.5 outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-white/30" />
              <button onClick={doStake} disabled={busy || !stakeAmt}
                className="px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all hover:opacity-90 disabled:opacity-30 flex items-center gap-1.5"
                style={{ background: accent }}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />} Stake
              </button>
            </div>
          </GlassCard>
        )}

        {!wallet.connected && <ConnectPrompt connect={connect} accent={accent} />}
        {tx && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><TxLink hash={tx} explorerUrl={d.explorerUrl} accent={accent} /></div>}
        <ContractInfo d={d} accent={accent} />
      </div>

      <SiteSections config={config} accent={accent} />
      <SocialSection config={config} accent={accent} />
      <SiteFooter name={stakingName} accent={accent} />
      <WhatsAppFloat number={config._whatsapp || ""} />
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function ConnectPrompt({ connect, accent }: { connect: () => void; accent: string }) {
  const rgb = hexToRgb(accent);
  return (
    <GlassCard accent={accent} className="text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
        style={{ background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.3)` }}>
        <Wallet className="w-6 h-6" style={{ color: accent }} />
      </div>
      <h3 className="font-semibold text-white">Connect your wallet</h3>
      <p className="text-sm text-white/50">Connect MetaMask to interact with this contract.</p>
      <button onClick={connect}
        className="w-full py-3 font-bold rounded-xl transition-all hover:opacity-90 flex items-center justify-center gap-2 text-white"
        style={{ background: accent }}>
        <Wallet className="w-4 h-4" /> Connect MetaMask
      </button>
    </GlassCard>
  );
}

function ContractInfo({ d, accent }: { d: DeploymentInfo; accent: string }) {
  return (
    <GlassCard accent={accent} className="space-y-2">
      <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Contract</p>
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono text-white/60 flex-1 truncate">{d.contractAddress}</code>
        <CopyBtn text={d.contractAddress} />
        <a href={`${d.explorerUrl}/address/${d.contractAddress}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-3.5 h-3.5 text-white/30 hover:text-white/70" />
        </a>
      </div>
      <p className="text-[11px] text-white/30">Network: {d.chainName}</p>
    </GlassCard>
  );
}

// ── Pump Token dApp ───────────────────────────────────────────────────────────

function PumpTokenDApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string; templateKey?: string }) {
  const abi = (d.contractAbi as string[] | null) ?? PUMP_ABI;
  const { wallet, connect, switchChain, onWrongChain } = useWallet(d.evmChainId, projectSlug);

  const [info,    setInfo]    = useState({ name: config.tokenName || "PumpToken", symbol: config.symbol || "PUMP", decimals: 18, price: "0", supply: "0" });
  const [balance, setBalance] = useState("0");
  const [ethAmt,  setEthAmt]  = useState("");
  const [tokAmt,  setTokAmt]  = useState("");
  const [busy,    setBusy]    = useState(false);
  const [toast,   setToast]   = useState({ msg: "", ok: true });
  const [tx,      setTx]      = useState("");

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: "", ok: true }), 5000); };

  useEffect(() => {
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = await mkReadProvider(d.rpcUrl, wallet.connected);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        const [name, symbol, price, supply] = await Promise.all([
          contract.name().catch(() => config.tokenName || "PumpToken"),
          contract.symbol().catch(() => config.symbol || "PUMP"),
          contract.currentPrice().catch(() => 0n),
          contract.totalSupply().catch(() => 0n),
        ]);
        setInfo({ name, symbol, decimals: 18, price: fmtUnits(price, 18, 8), supply: fmtUnits(supply, 18, 2) });
      } catch { /* ignore */ }
    })();
  }, [d, abi, config, wallet.connected]);

  useEffect(() => {
    if (!wallet.connected) return;
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = await mkReadProvider(d.rpcUrl, true);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        const bal = await contract.balanceOf(wallet.address).catch(() => 0n);
        setBalance(fmtUnits(bal, 18, 4));
      } catch (e) { console.warn("[pump balance]", e); }
    })();
  }, [wallet, d, abi]);

  const doBuy = async () => {
    if (!ethAmt) return;
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.buy({ value: ethers.parseEther(ethAmt) })).wait();
      setTx(receipt?.hash ?? "");
      showToast(`Bought tokens with ${ethAmt} ETH!`, true);
      setEthAmt("");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 100) : "Buy failed", false); }
    finally { setBusy(false); }
  };

  const doSell = async () => {
    if (!tokAmt) return;
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.sell(parseUnits(tokAmt, 18))).wait();
      setTx(receipt?.hash ?? "");
      showToast(`Sold ${tokAmt} tokens!`, true);
      setTokAmt("");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 100) : "Sell failed", false); }
    finally { setBusy(false); }
  };

  const accent = getAccent(config);
  const bg     = getBg(config);
  const rgb    = hexToRgb(accent);
  const emoji  = config.emoji || "📈";

  return (
    <div className="min-h-screen" style={{ background: bg, color: "#fff" }}>
      <SiteNav name={`${emoji} ${info.name}`} symbol={info.symbol} chainName={d.chainName} accent={accent}
        wallet={wallet} connect={connect} onWrongChain={onWrongChain} switchChain={switchChain} />
      <SiteHero name={info.name} symbol={info.symbol} description={config.description || "Bonding curve token"} accent={accent} config={config}
        connect={connect} walletConnected={wallet.connected} />

      <div className="max-w-lg mx-auto px-4 pb-16 space-y-4">
        <Toast msg={toast.msg} ok={toast.ok} />

        {/* Price card */}
        <GlassCard accent={accent} className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40">Current Price</p>
              <p className="text-2xl font-extrabold text-white">{info.price} ETH</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Circulating Supply</p>
              <p className="text-sm font-bold text-white">{info.supply} {info.symbol}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            Price rises with every purchase
          </div>
        </GlassCard>

        {wallet.connected && !onWrongChain ? (
          <GlassCard accent={accent} className="space-y-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-1.5"><Zap className="w-4 h-4" style={{ color: accent }} /> Trade {info.symbol}</h3>
            {parseFloat(balance) > 0 && (
              <p className="text-xs text-white/40">Your balance: <span className="text-white/70 font-semibold">{balance} {info.symbol}</span></p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-emerald-400">Buy with ETH</p>
                <input value={ethAmt} onChange={e => setEthAmt(e.target.value)} placeholder="0.01 ETH"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-white/30" />
                <button onClick={doBuy} disabled={busy || !ethAmt}
                  className="w-full py-2.5 text-white text-sm font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-1.5"
                  style={{ background: `linear-gradient(135deg, ${accent}, rgba(${rgb},0.6))` }}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />} Buy
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-400">Sell Tokens</p>
                <input value={tokAmt} onChange={e => setTokAmt(e.target.value)} placeholder="100 PUMP"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-white/30" />
                <button onClick={doSell} disabled={busy || !tokAmt}
                  className="w-full py-2.5 text-white/70 text-sm font-bold rounded-xl transition-all hover:bg-white/10 disabled:opacity-30 flex items-center justify-center gap-1.5"
                  style={{ border: "1px solid rgba(255,255,255,0.2)" }}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Sell
                </button>
              </div>
            </div>
          </GlassCard>
        ) : !wallet.connected ? (
          <ConnectPrompt connect={connect} accent={accent} />
        ) : null}

        {tx && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><TxLink hash={tx} explorerUrl={d.explorerUrl} accent={accent} /></div>}
        <ContractInfo d={d} accent={accent} />
      </div>
      <SiteSections config={config} accent={accent} />
      <SocialSection config={config} accent={accent} />
      <SiteFooter name={info.name} accent={accent} />
      <WhatsAppFloat number={config._whatsapp || ""} />
    </div>
  );
}

// ── NFT Mint Page dApp ────────────────────────────────────────────────────────

function NFTMintDApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string; templateKey?: string }) {
  const abi = (d.contractAbi as string[] | null) ?? OPEN_EDITION_ABI;
  const { wallet, connect, switchChain, onWrongChain } = useWallet(d.evmChainId, projectSlug);

  const [info,    setInfo]    = useState({ name: config.collectionName || "NFT Drop", symbol: config.symbol || "MNFT", max: BigInt(0), price: BigInt(0), minted: BigInt(0), saleActive: false, owner: "" });
  const [balance, setBalance] = useState(BigInt(0));
  const [qty,     setQty]     = useState(1);
  const [busy,    setBusy]    = useState(false);
  const [toast,   setToast]   = useState({ msg: "", ok: true });
  const [tx,      setTx]      = useState("");

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: "", ok: true }), 5000); };

  useEffect(() => {
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = await mkReadProvider(d.rpcUrl, wallet.connected);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        const [name, symbol, max, price, minted, saleActive, owner] = await Promise.all([
          contract.name().catch(() => config.collectionName || "NFT Drop"),
          contract.symbol().catch(() => "MNFT"),
          contract.MAX_SUPPLY().catch(() => BigInt(config.maxSupply || "1000")),
          contract.MINT_PRICE().catch(() => BigInt(0)),
          contract.totalMinted().catch(() => 0n),
          contract.saleActive().catch(() => false),
          contract.owner().catch(() => ""),
        ]);
        setInfo({ name, symbol, max, price, minted, saleActive, owner });
      } catch { /* ignore */ }
    })();
  }, [d, abi, config, wallet.connected]);

  useEffect(() => {
    if (!wallet.connected) return;
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = await mkReadProvider(d.rpcUrl, true);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        setBalance(await contract.balanceOf(wallet.address).catch(() => 0n));
      } catch (e) { console.warn("[nft-mint balance]", e); }
    })();
  }, [wallet, d, abi]);

  const mintNFT = async () => {
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const value      = info.price * BigInt(qty);
      const receipt    = await (await contract.mint(qty, { value })).wait();
      setTx(receipt?.hash ?? "");
      showToast(`Minted ${qty} NFT${qty > 1 ? "s" : ""}!`, true);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 100) : "Mint failed", false); }
    finally { setBusy(false); }
  };

  const toggleSale = async () => {
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      await (await contract.setSaleActive(!info.saleActive)).wait();
      setInfo(prev => ({ ...prev, saleActive: !prev.saleActive }));
      showToast(info.saleActive ? "Sale paused" : "Sale activated!", true);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 100) : "Failed", false); }
    finally { setBusy(false); }
  };

  const accent   = getAccent(config);
  const bg       = getBg(config);
  const rgb      = hexToRgb(accent);
  const isOwner  = wallet.connected && info.owner && wallet.address.toLowerCase() === info.owner.toLowerCase();
  const pct      = info.max > 0n ? Number((info.minted * 100n) / info.max) : 0;
  const totalCost = fmtUnits(info.price * BigInt(qty), 18, 4);

  return (
    <div className="min-h-screen" style={{ background: bg, color: "#fff" }}>
      <SiteNav name={`🎨 ${info.name}`} symbol={info.symbol} chainName={d.chainName} accent={accent}
        wallet={wallet} connect={connect} onWrongChain={onWrongChain} switchChain={switchChain} />
      <SiteHero name={info.name} symbol={info.symbol} description={config.description || "A limited NFT drop."} accent={accent} config={config}
        connect={connect} walletConnected={wallet.connected} />

      <div className="max-w-lg mx-auto px-4 pb-16 space-y-4">
        <Toast msg={toast.msg} ok={toast.ok} />

        {/* Supply progress */}
        <GlassCard accent={accent} className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Minted</span>
            <span className="font-bold text-white">{info.minted.toString()} / {info.max.toString()}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-white/10">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, rgba(${rgb},0.6))` }} />
          </div>
          <p className="text-xs text-white/40">{pct}% minted · {(Number(info.max) - Number(info.minted)).toString()} remaining</p>
        </GlassCard>

        {wallet.connected && balance > 0n && (
          <GlassCard accent={accent}><p className="text-sm text-white/60">Your NFTs: <span className="text-white font-bold">{balance.toString()}</span></p></GlassCard>
        )}

        {wallet.connected && !onWrongChain ? (
          <GlassCard accent={accent} className="space-y-4">
            <h3 className="font-semibold text-white text-sm">Mint NFT</h3>
            {!info.saleActive && !isOwner && (
              <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" /> Sale is not active yet
              </div>
            )}
            <div className="flex items-center gap-3">
              <p className="text-sm text-white/60 flex-1">Quantity</p>
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white font-bold">−</button>
                <span className="w-6 text-center text-sm font-bold text-white">{qty}</span>
                <button onClick={() => setQty(Math.min(10, qty + 1))} className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white font-bold">+</button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Total cost</span>
              <span className="font-bold text-white">{totalCost} {d.nativeCurrency}</span>
            </div>
            <button onClick={mintNFT} disabled={busy || !info.saleActive}
              className="w-full py-3 font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2 text-white"
              style={{ background: `linear-gradient(135deg, ${accent}, rgba(${rgb},0.6))`, boxShadow: `0 0 20px rgba(${rgb},0.3)` }}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
              {busy ? "Minting…" : `Mint ${qty} NFT${qty > 1 ? "s" : ""}`}
            </button>
          </GlassCard>
        ) : !wallet.connected ? (
          <ConnectPrompt connect={connect} accent={accent} />
        ) : null}

        {isOwner && (
          <GlassCard accent={accent} className="space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-1.5"><Zap className="w-4 h-4" style={{ color: accent }} /> Owner Controls</h3>
            <button onClick={toggleSale} disabled={busy}
              className={`w-full py-2.5 text-sm font-semibold rounded-xl border transition-all ${info.saleActive ? "border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20" : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"}`}>
              {info.saleActive ? "⏸ Pause Sale" : "▶ Activate Sale"}
            </button>
          </GlassCard>
        )}

        {tx && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><TxLink hash={tx} explorerUrl={d.explorerUrl} accent={accent} /></div>}
        <ContractInfo d={d} accent={accent} />
      </div>
      <SiteSections config={config} accent={accent} />
      <SocialSection config={config} accent={accent} />
      <SiteFooter name={info.name} accent={accent} />
      <WhatsAppFloat number={config._whatsapp || ""} />
    </div>
  );
}

// ── Token-Gated Access dApp ───────────────────────────────────────────────────

function TokenGatedDApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string; templateKey?: string }) {
  const abi = (d.contractAbi as string[] | null) ?? TOKEN_GATE_ABI;
  const { wallet, connect, switchChain, onWrongChain } = useWallet(d.evmChainId, projectSlug);

  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking,  setChecking]  = useState(false);
  const [minBal,    setMinBal]    = useState(config.minBalance || "1");
  const [toast,     setToast]     = useState({ msg: "", ok: true });

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: "", ok: true }), 5000); };

  const checkAccess = useCallback(async () => {
    if (!wallet.connected) return;
    setChecking(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = await mkReadProvider(d.rpcUrl, true);
      const contract   = new ethers.Contract(d.contractAddress, abi, provider);
      const [access, min] = await Promise.all([
        contract.hasAccess(wallet.address).catch(() => false),
        contract.minBalance().catch(() => BigInt(config.minBalance || "1")),
      ]);
      setHasAccess(access);
      setMinBal(fmtUnits(min, 18, 0));
    } catch (e) { console.warn("[token-gate]", e); setHasAccess(false); }
    finally { setChecking(false); }
  }, [wallet.connected, wallet.address, d, abi, config]);

  useEffect(() => { if (wallet.connected) checkAccess(); }, [wallet.connected, checkAccess]);

  const accent  = getAccent(config);
  const bg      = getBg(config);
  const rgb     = hexToRgb(accent);
  const title   = config.contentTitle || "Members Only";
  const desc    = config.description  || "Hold the token to unlock exclusive access.";
  const url     = config.accessUrl    || "";

  return (
    <div className="min-h-screen" style={{ background: bg, color: "#fff" }}>
      <nav className="sticky top-0 z-50 border-b border-white/10" style={{ background: `rgba(10,10,15,0.85)`, backdropFilter: "blur(16px)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <span className="font-bold text-white text-sm flex-1">🔐 {title}</span>
          <NetBadge chainName={d.chainName} />
          {wallet.connected
            ? <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/5">
                <div className={`w-1.5 h-1.5 rounded-full ${hasAccess ? "bg-emerald-400" : "bg-red-400"}`} />
                <span className="text-xs text-white/70 font-mono">{shortenAddress(wallet.address)}</span>
              </div>
            : <button onClick={connect} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: accent }}>Connect Wallet</button>
          }
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Toast msg={toast.msg} ok={toast.ok} />

        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: `rgba(${rgb},0.12)`, border: `2px solid rgba(${rgb},0.3)` }}>
          <span className="text-5xl">{hasAccess ? "🔓" : "🔐"}</span>
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-3">{title}</h1>
        <p className="text-white/60 mb-8">{desc}</p>

        <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl mb-8 inline-flex"
          style={{ background: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.25)` }}>
          <Coins className="w-4 h-4" style={{ color: accent }} />
          <span className="text-sm font-semibold" style={{ color: accent }}>
            Requires {minBal}+ token{Number(minBal) !== 1 ? "s" : ""} in wallet
          </span>
        </div>

        {!wallet.connected ? (
          <button onClick={connect}
            className="w-full py-4 rounded-xl text-white font-bold text-lg transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${accent}, rgba(${rgb},0.7))` }}>
            Connect Wallet to Verify
          </button>
        ) : onWrongChain ? (
          <button onClick={switchChain}
            className="w-full py-4 rounded-xl font-bold text-amber-400 bg-amber-500/20 border border-amber-500/30">
            Switch Network
          </button>
        ) : checking ? (
          <div className="flex items-center justify-center gap-2 py-4 text-white/50">
            <Loader2 className="w-5 h-5 animate-spin" /> Verifying token balance…
          </div>
        ) : hasAccess ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 justify-center">
              <CheckCircle2 className="w-5 h-5" /> Access granted!
            </div>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-bold text-lg transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${accent}, rgba(${rgb},0.7))` }}>
                Enter Members Area <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 justify-center">
              <AlertCircle className="w-5 h-5" /> Insufficient token balance
            </div>
            <p className="text-sm text-white/40">Get more tokens and try again.</p>
            <button onClick={checkAccess} className="text-sm text-white/50 hover:text-white/80 flex items-center gap-1.5 mx-auto">
              <RefreshCw className="w-3.5 h-3.5" /> Re-check balance
            </button>
          </div>
        )}
        <div className="mt-8"><ContractInfo d={d} accent={accent} /></div>
      </div>
      <SiteFooter name={title} accent={accent} />
    </div>
  );
}

// ── Click-to-Earn dApp ────────────────────────────────────────────────────────

function ClickToEarnDApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string; templateKey?: string }) {
  const abi = (d.contractAbi as string[] | null) ?? CLICK_EARN_ABI;
  const { wallet, connect, switchChain, onWrongChain } = useWallet(d.evmChainId, projectSlug);

  const [reward,    setReward]    = useState("0");
  const [pending,   setPending]   = useState("0");
  const [clicks,    setClicks]    = useState(0);
  const [coolLeft,  setCoolLeft]  = useState(0);
  const [busy,      setBusy]      = useState(false);
  const [toast,     setToast]     = useState({ msg: "", ok: true });
  const [tx,        setTx]        = useState("");
  const [animating, setAnimating] = useState(false);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: "", ok: true }), 5000); };

  const loadState = useCallback(async () => {
    if (!wallet.connected) return;
    try {
      const { ethers } = await import("ethers");
      const provider   = await mkReadProvider(d.rpcUrl, wallet.connected);
      const contract   = new ethers.Contract(d.contractAddress, abi, provider);
      const [rpc, pend, ttl, tot] = await Promise.all([
        contract.rewardPerClick().catch(() => 0n),
        contract.pendingRewards(wallet.address).catch(() => 0n),
        contract.timeUntilNextClick(wallet.address).catch(() => 0n),
        contract.totalClicks(wallet.address).catch(() => 0n),
      ]);
      setReward(fmtUnits(rpc, 18, 6));
      setPending(fmtUnits(pend, 18, 6));
      setCoolLeft(Number(ttl));
      setClicks(Number(tot));
    } catch (e) { console.warn("[click-earn state]", e); }
  }, [wallet.connected, wallet.address, d, abi]);

  useEffect(() => { loadState(); }, [loadState]);

  // Countdown timer
  useEffect(() => {
    if (coolLeft <= 0) return;
    const t = setInterval(() => setCoolLeft(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [coolLeft]);

  const doClick = async () => {
    if (coolLeft > 0 || busy) return;
    setAnimating(true);
    setBusy(true);
    setTimeout(() => setAnimating(false), 400);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      await (await contract.click()).wait();
      setClicks(c => c + 1);
      showToast(`+${reward} ETH earned!`, true);
      setCoolLeft(Number(config.cooldown || 3));
      await loadState();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 100) : "Click failed", false); }
    finally { setBusy(false); }
  };

  const doClaim = async () => {
    if (!parseFloat(pending) || busy) return;
    setBusy(true);
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer     = await provider.getSigner();
      const contract   = new ethers.Contract(d.contractAddress, abi, signer);
      const receipt    = await (await contract.claim()).wait();
      setTx(receipt?.hash ?? "");
      showToast(`Claimed ${pending} ETH!`, true);
      setPending("0");
      await loadState();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message.slice(0, 100) : "Claim failed", false); }
    finally { setBusy(false); }
  };

  const accent  = getAccent(config);
  const bg      = getBg(config);
  const rgb     = hexToRgb(accent);
  const name    = config.gameName || "TapToEarn";
  const emoji   = config.emoji   || "👆";
  const canClick = coolLeft <= 0 && !busy && wallet.connected && !onWrongChain;

  return (
    <div className="min-h-screen" style={{ background: bg, color: "#fff" }}>
      <SiteNav name={`${emoji} ${name}`} symbol="EARN" chainName={d.chainName} accent={accent}
        wallet={wallet} connect={connect} onWrongChain={onWrongChain} switchChain={switchChain} />
      <SiteHero name={name} symbol="EARN" description={config.description || "Tap to earn ETH rewards."} accent={accent} config={config}
        connect={connect} walletConnected={wallet.connected} />

      <div className="max-w-lg mx-auto px-4 pb-16 space-y-4">
        <Toast msg={toast.msg} ok={toast.ok} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Your Clicks",  value: clicks.toString() },
            { label: "Pending ETH",  value: pending },
            { label: "Per Click",    value: reward + " ETH" },
          ].map(s => (
            <GlassCard key={s.label} accent={accent} className="text-center !p-3">
              <p className="text-[10px] text-white/40 mb-0.5">{s.label}</p>
              <p className="text-sm font-bold text-white">{s.value}</p>
            </GlassCard>
          ))}
        </div>

        {/* Tap button */}
        {wallet.connected && !onWrongChain ? (
          <GlassCard accent={accent} className="flex flex-col items-center py-8 space-y-6">
            <div className="relative">
              <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 transition-all ${animating ? "scale-125" : "scale-100"}`} style={{ background: accent }} />
              <button
                onClick={doClick}
                disabled={!canClick}
                className={`relative w-40 h-40 rounded-full text-6xl flex items-center justify-center transition-all select-none ${animating ? "scale-90" : "scale-100"} ${canClick ? "hover:scale-105 cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                style={{
                  background: `radial-gradient(circle, rgba(${rgb},0.4), rgba(${rgb},0.15))`,
                  border: `2px solid rgba(${rgb},0.6)`,
                  boxShadow: canClick ? `0 0 40px rgba(${rgb},0.5)` : "none",
                }}>
                {emoji}
              </button>
            </div>
            {coolLeft > 0 ? (
              <p className="text-sm text-white/50">Next tap in <span className="font-bold text-white">{coolLeft}s</span></p>
            ) : (
              <p className="text-sm font-bold" style={{ color: accent }}>Tap to earn {reward} ETH!</p>
            )}
            {parseFloat(pending) > 0 && (
              <button onClick={doClaim} disabled={busy}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, #10b981, #059669)` }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                Claim {pending} ETH
              </button>
            )}
          </GlassCard>
        ) : !wallet.connected ? (
          <ConnectPrompt connect={connect} accent={accent} />
        ) : null}

        {tx && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><TxLink hash={tx} explorerUrl={d.explorerUrl} accent={accent} /></div>}
        <ContractInfo d={d} accent={accent} />
      </div>
      <SiteSections config={config} accent={accent} />
      <SocialSection config={config} accent={accent} />
      <SiteFooter name={name} accent={accent} />
      <WhatsAppFloat number={config._whatsapp || ""} />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ProjectDApp({ data }: { data: ProjectData }) {
  const { deployment: d, templateKey, config } = data;
  const accent = getAccent(config);
  const bg     = getBg(config);
  const rgb    = hexToRgb(accent);

  if (!d || !d.contractAddress) {
    // Show a full site preview so the frontend editor can display sections,
    // colors, team, FAQ etc. even before the contract is deployed.
    // A yellow banner indicates this is preview/draft mode.
    const name = config.tokenName || config.collectionName || config.daoName || data.name;
    const symbol = config.symbol || config.tokenSymbol || "TKN";
    const desc   = config.description || "";
    return (
      <div className="min-h-screen" style={{ background: bg, color: "#fff" }}>
        {/* Preview mode banner */}
        <div className="w-full text-center text-xs font-semibold py-2 px-4 sticky top-0 z-50"
          style={{ background: "rgba(245,158,11,0.92)", backdropFilter: "blur(8px)", color: "#000" }}>
          ⚡ Preview mode — contract not yet deployed · Wallet features activate after deploy
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden pt-16 pb-14 px-4 text-center">
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20 blur-3xl"
              style={{ background: `radial-gradient(ellipse, rgba(${rgb},0.6) 0%, transparent 70%)` }} />
          </div>
          <div className="relative max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border mb-6"
              style={{ borderColor: `rgba(${rgb},0.4)`, background: `rgba(${rgb},0.1)`, color: accent }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
              Draft · Deploy to go live
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-2">
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, #fff 30%, rgba(${rgb},0.9) 100%)` }}>
                {name}
              </span>
            </h1>
            {symbol && <p className="text-2xl font-bold mb-4" style={{ color: accent }}>${symbol}</p>}
            {desc && <p className="text-white/60 text-base leading-relaxed mb-8 max-w-lg mx-auto">{desc}</p>}
            <button disabled
              className="px-6 py-3 rounded-xl font-bold text-white text-sm opacity-40 cursor-not-allowed"
              style={{ background: accent }}>
              Connect Wallet (deploy first)
            </button>
          </div>
        </section>

        {/* All editable sections — visible in preview */}
        <SiteSections config={config} accent={accent} />
        <SocialSection config={config} accent={accent} />
        <SiteFooter name={name} accent={accent} />
        <WhatsAppFloat number={config._whatsapp || ""} />
      </div>
    );
  }

  const props = { d, config, projectSlug: data.slug, templateKey };
  switch (templateKey) {
    case "erc20-token":      return <ERC20DApp       {...props} />;
    case "meme-token":       return <ERC20DApp       {...props} />;
    case "nft-collection":   return <NFTDApp         {...props} />;
    case "dao-governance":   return <DAODApp         {...props} />;
    case "staking-dashboard":return <StakingDApp     {...props} />;
    case "pump-token":       return <PumpTokenDApp   {...props} />;
    case "nft-mint":         return <NFTMintDApp     {...props} />;
    case "token-gated":      return <TokenGatedDApp  {...props} />;
    case "click-to-earn":    return <ClickToEarnDApp {...props} />;
    default:                 return <ERC20DApp       {...props} />;
  }
}
