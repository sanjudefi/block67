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

interface TeamMember { name: string; role: string; bio?: string; avatar?: string; twitter?: string; }
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
                  {m.avatar ? <img src={m.avatar} className="w-10 h-10 rounded-full object-cover" alt={m.name} /> : m.name[0]}
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

function ContactSection({ email, accent }: { email: string; accent: string }) {
  if (!email) return null;
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
        <a href={`mailto:${email}`}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
          style={{ background: accent }}>
          <Mail className="w-4 h-4" /> {email}
        </a>
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
      {sections.includes("contact")  && config._contact_email && <ContactSection email={config._contact_email} accent={accent} />}
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

function ERC20DApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string }) {
  const isMeme = config._templateKey === "meme-token";
  const abi    = (d.contractAbi as string[] | null) ?? ERC20_ABI;
  const { wallet, error: wErr, connect, switchChain, onWrongChain } = useWallet(d.evmChainId, projectSlug);

  const [loading, setLoading] = useState(true);
  const [info,    setInfo]    = useState({ name: config.tokenName || "Token", symbol: config.symbol || "TKN", supply: "0", decimals: 18, owner: "" });
  const [balance, setBalance] = useState("");
  const [taxBps,  setTaxBps]  = useState<number | null>(null);
  const [toast,   setToast]   = useState({ msg: "", ok: true });
  const [tx,      setTx]      = useState("");
  const [toAddr,  setToAddr]  = useState("");
  const [amount,  setAmount]  = useState("");
  const [mintTo,  setMintTo]  = useState("");
  const [mintAmt, setMintAmt] = useState("");
  const [busy,    setBusy]    = useState(false);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: "", ok: true }), 5000); };

  const loadInfo = useCallback(async () => {
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
      const contract   = new ethers.Contract(d.contractAddress, abi, provider);
      const [name, symbol, decimals, supply, owner] = await Promise.all([
        contract.name().catch(() => config.tokenName || "Token"),
        contract.symbol().catch(() => config.symbol || "TKN"),
        contract.decimals().catch(() => 18),
        contract.totalSupply().catch(() => 0n),
        contract.owner().catch(() => ""),
      ]);
      const tax = isMeme ? await contract.taxBps().catch(() => null) : null;
      setInfo({ name, symbol, supply: fmtUnits(supply, Number(decimals), 2), decimals: Number(decimals), owner });
      if (tax !== null) setTaxBps(Number(tax));
    } catch { /* RPC might fail on unsupported chains */ }
    finally { setLoading(false); }
  }, [d, abi, config, isMeme]);

  const loadBalance = useCallback(async () => {
    if (!wallet.connected) return;
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
      const contract   = new ethers.Contract(d.contractAddress, abi, provider);
      const bal: bigint = await contract.balanceOf(wallet.address);
      setBalance(fmtUnits(bal, info.decimals));
    } catch { setBalance("—"); }
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
      showToast(e instanceof Error ? e.message.slice(0, 100) : "Transfer failed", false);
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
      showToast(e instanceof Error ? e.message.slice(0, 100) : "Mint failed", false);
    } finally { setBusy(false); }
  };

  const isOwner = wallet.connected && info.owner && wallet.address.toLowerCase() === info.owner.toLowerCase();
  const isMintable = config.mintable === "true" || isMeme;

  const accent = getAccent(config);
  const rgb    = hexToRgb(accent);
  const desc   = config.description || config.tokenDescription || "";

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f", color: "#fff" }}>
      <SiteNav name={info.name} symbol={info.symbol} chainName={d.chainName} accent={accent}
        wallet={wallet} connect={connect} onWrongChain={onWrongChain} switchChain={switchChain} />

      <SiteHero name={info.name} symbol={info.symbol} description={desc} accent={accent} config={config}
        connect={connect} walletConnected={wallet.connected} />

      <div className="max-w-2xl mx-auto px-4 pb-6 space-y-4">
        {loading && <div className="flex items-center gap-2 text-sm text-white/40"><Loader2 className="w-4 h-4 animate-spin" /> Loading contract data…</div>}
        {wErr && <Toast msg={wErr} ok={false} />}
        <Toast msg={toast.msg} ok={toast.ok} />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <GlassCard accent={accent}>
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Total Supply</p>
            <p className="font-bold text-white">{info.supply} <span className="text-white/40 font-normal text-xs">{info.symbol}</span></p>
          </GlassCard>
          <GlassCard accent={accent}>
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Contract</p>
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-white/60 truncate">{shortenAddress(d.contractAddress)}</span>
              <CopyBtn text={d.contractAddress} />
              <a href={`${d.explorerUrl}/address/${d.contractAddress}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 text-white/30 hover:text-white/70" />
              </a>
            </div>
          </GlassCard>
        </div>

        {/* Balance */}
        {wallet.connected && (
          <GlassCard accent={accent}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-white/40 uppercase tracking-wider">Your Balance</p>
              <button onClick={loadBalance} className="text-white/30 hover:text-white/70"><RefreshCw className="w-3 h-3" /></button>
            </div>
            <p className="text-2xl font-bold text-white">{balance || "—"} <span className="text-base font-normal text-white/40">{info.symbol}</span></p>
            <p className="text-xs text-white/30 font-mono mt-1">{shortenAddress(wallet.address)}</p>
          </GlassCard>
        )}

        {/* Transfer */}
        {wallet.connected && !onWrongChain && (
          <GlassCard accent={accent} className="space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-1.5"><Send className="w-4 h-4" style={{ color: accent }} /> Transfer</h3>
            <input value={toAddr} onChange={(e) => setToAddr(e.target.value)} placeholder="Recipient address (0x…)"
              className="w-full text-sm rounded-xl px-3 py-2.5 outline-none font-mono bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-white/30" />
            <div className="flex gap-2">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Amount (${info.symbol})`}
                className="flex-1 text-sm rounded-xl px-3 py-2.5 outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-white/30" />
              <button onClick={transfer} disabled={busy || !toAddr || !amount}
                className="px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all hover:opacity-90 disabled:opacity-30 flex items-center gap-1.5"
                style={{ background: accent }}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send
              </button>
            </div>
          </GlassCard>
        )}

        {/* Mint (owner only) */}
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

function NFTDApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string }) {
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
      const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
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
  }, [d, abi, config]);

  const loadBalance = useCallback(async () => {
    if (!wallet.connected) return;
    try {
      const { ethers } = await import("ethers");
      const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
      const contract   = new ethers.Contract(d.contractAddress, abi, provider);
      const bal = await contract.balanceOf(wallet.address);
      setBalance(bal);
    } catch { /* ignore */ }
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
  const rgb    = hexToRgb(accent);
  const desc   = config.description || config.collectionDescription || "";

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f", color: "#fff" }}>
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

function DAODApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string }) {
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
        const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
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
  }, [d, abi, config]);

  useEffect(() => {
    if (!wallet.connected) return;
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        const [bal, del] = await Promise.all([
          contract.balanceOf(wallet.address).catch(() => 0n),
          contract.delegates(wallet.address).catch(() => ""),
        ]);
        setBalance(fmtUnits(bal, 18, 2));
        setDelegate(del);
      } catch { /* ignore */ }
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
  const rgb    = hexToRgb(accent);
  const desc   = config.description || config.daoDescription || "";

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f", color: "#fff" }}>
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

function StakingDApp({ d, config, projectSlug }: { d: DeploymentInfo; config: Record<string, string>; projectSlug: string }) {
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
        const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
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
  }, [d, abi, config]);

  useEffect(() => {
    if (!wallet.connected) return;
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider   = new ethers.JsonRpcProvider(d.rpcUrl);
        const contract   = new ethers.Contract(d.contractAddress, abi, provider);
        const [staked, earned, stakedAt] = await Promise.all([
          contract.staked(wallet.address).catch(() => 0n),
          contract.earned(wallet.address).catch(() => 0n),
          contract.stakedAt(wallet.address).catch(() => 0n),
        ]);
        setPosition({ staked: fmtUnits(staked, 18, 4), earned: fmtUnits(earned, 18, 6), stakedAt: Number(stakedAt) });
      } catch { /* ignore */ }
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
  const rgb    = hexToRgb(accent);
  const desc   = config.description || config.stakingDescription || "";
  const stakingName = config.tokenName || "Staking";

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f", color: "#fff" }}>
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

// ── Main export ───────────────────────────────────────────────────────────────

export function ProjectDApp({ data }: { data: ProjectData }) {
  const { deployment: d, templateKey, config } = data;
  const accent = getAccent(config);
  const rgb    = hexToRgb(accent);

  if (!d || !d.contractAddress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
        style={{ background: "#0a0a0f" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full opacity-15 blur-3xl"
            style={{ background: `radial-gradient(ellipse, rgba(${rgb},0.6) 0%, transparent 70%)` }} />
        </div>
        <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.3)` }}>
          <Zap className="w-8 h-8" style={{ color: accent }} />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-3">{data.name}</h1>
        <p className="text-white/50 mb-2">This project hasn&apos;t been deployed to a blockchain yet.</p>
        <p className="text-xs text-white/30">The contract will appear here once the owner deploys it.</p>
      </div>
    );
  }

  const props = { d, config, projectSlug: data.slug };
  switch (templateKey) {
    case "erc20-token":      return <ERC20DApp    {...props} />;
    case "meme-token":       return <ERC20DApp    {...props} />;
    case "nft-collection":   return <NFTDApp      {...props} />;
    case "dao-governance":   return <DAODApp      {...props} />;
    case "staking-dashboard":return <StakingDApp  {...props} />;
    default:                 return <ERC20DApp    {...props} />;
  }
}
