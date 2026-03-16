/**
 * Public project page — served at:
 *   pepecoin.block67.app  →  /site/pepecoin
 *   block67.app/site/pepecoin  (direct URL, no auth required)
 *
 * Server component — no authentication needed.
 */
import { notFound } from "next/navigation";
import { db as prisma } from "@/lib/db/index";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import type { Metadata } from "next";
import Link from "next/link";
import { Zap, Globe, ShieldCheck, ExternalLink, Copy } from "lucide-react";

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const project = await getProject(params.slug);
  if (!project) return { title: "Not Found" };
  return {
    title:       `${project.name} — Block67`,
    description: project.description ?? `${project.name} is a Web3 project deployed on Block67.`,
    openGraph: {
      title:       project.name,
      description: project.description ?? `${project.name} on Block67`,
      type:        "website",
    },
  };
}

// ── Data ──────────────────────────────────────────────────────────────────────
async function getProject(slug: string) {
  return prisma.project.findUnique({
    where:   { slug },
    include: { deployments: { orderBy: { createdAt: "desc" }, take: 1 }, owner: { select: { name: true, email: true } } },
  });
}

// ── Template helpers ──────────────────────────────────────────────────────────
function templateMeta(tKey: string) {
  const t = BUILTIN_TEMPLATES.find((b) => b.id === tKey);
  return { icon: t?.icon ?? "🔗", name: t?.name ?? "Smart Contract", gradient: t?.gradient ?? "from-indigo-500 to-violet-600" };
}

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet", 11155111: "Sepolia Testnet", 137: "Polygon",
  8453: "Base", 10: "Optimism", 42161: "Arbitrum One",
  56: "BNB Chain", 43114: "Avalanche", 250: "Fantom",
  25: "Cronos", 1284: "Moonbeam", 100: "Gnosis",
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function SitePage({ params }: { params: { slug: string } }) {
  const project = await getProject(params.slug);

  if (!project || project.status !== "ACTIVE") notFound();

  const cfg       = (project.paramValues ?? {}) as Record<string, string>;
  const tKey      = cfg._templateKey ?? "";
  const tmpl      = templateMeta(tKey);
  const lastDeploy = project.deployments[0] ?? null;
  const chainId    = lastDeploy ? Number(lastDeploy.chainId) : null;
  const chainName  = chainId ? (CHAIN_NAMES[chainId] ?? `Chain ${chainId}`) : null;

  const tokenName  = cfg.tokenName  || cfg.collectionName || cfg.daoName || project.name;
  const symbol     = cfg.symbol     || "";
  const desc       = cfg.description || "";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Nav bar ──────────────────────────────────────────────────────── */}
      <nav className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 sticky top-0 z-20">
        <Link href="https://block67.app" className="flex items-center gap-1.5 shrink-0">
          <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold text-gray-600">block<span className="text-indigo-600">67</span></span>
        </Link>
        <span className="text-gray-200">·</span>
        <span className="text-xs text-gray-500 font-mono truncate">{params.slug}.block67.app</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center text-center px-4 pt-16 pb-10">
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${tmpl.gradient} flex items-center justify-center text-4xl mb-6 shadow-lg`}>
          {tmpl.icon}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{tokenName}</h1>
        {symbol && (
          <span className="text-sm font-mono text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full mb-4">
            ${symbol}
          </span>
        )}
        {desc && <p className="text-gray-500 max-w-lg leading-relaxed">{desc}</p>}
      </section>

      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto w-full px-4 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* Contract type */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Contract Type</p>
            <p className="font-bold text-gray-900">{tmpl.name}</p>
          </div>

          {/* Network */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Network</p>
            <p className="font-bold text-gray-900">{chainName ?? "—"}</p>
          </div>

          {/* Security */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Security</p>
            <div className="flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <p className="font-bold text-emerald-700">Audited</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contract address ─────────────────────────────────────────────── */}
      {lastDeploy?.contractAddress && (
        <section className="max-w-2xl mx-auto w-full px-4 pb-10">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contract Address</p>
              {chainId && (
                <a
                  href={explorerLink(chainId, lastDeploy.contractAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  View on explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
              <code className="text-xs font-mono text-gray-700 flex-1 truncate">
                {lastDeploy.contractAddress}
              </code>
              {/* Copy button — client island */}
              <CopyButton text={lastDeploy.contractAddress} />
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-[11px] text-emerald-700">
                OpenZeppelin v5 · Solidity 0.8.20 · Security audited
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Token details ─────────────────────────────────────────────────── */}
      <TokenDetails cfg={cfg} tKey={tKey} />

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-gray-200 py-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by{" "}
          <a href="https://block67.app" className="text-indigo-600 font-semibold hover:underline">
            Block67
          </a>{" "}
          · Audited Solidity contracts · Deploy in minutes
        </p>
      </footer>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function explorerLink(chainId: number, address: string): string {
  const explorers: Record<number, string> = {
    1:        "https://etherscan.io/address/",
    11155111: "https://sepolia.etherscan.io/address/",
    137:      "https://polygonscan.com/address/",
    8453:     "https://basescan.org/address/",
    10:       "https://optimistic.etherscan.io/address/",
    42161:    "https://arbiscan.io/address/",
    56:       "https://bscscan.com/address/",
    43114:    "https://snowtrace.io/address/",
  };
  const base = explorers[chainId] ?? "https://etherscan.io/address/";
  return `${base}${address}`;
}

// ── Client island: copy button ────────────────────────────────────────────────
"use client";
import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0"
    >
      {copied ? <span className="text-[11px] text-emerald-600 font-medium">Copied!</span> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Token detail rows ─────────────────────────────────────────────────────────
function TokenDetails({ cfg, tKey }: { cfg: Record<string, string>; tKey: string }) {
  const rows: { label: string; value: string }[] = [];

  if (tKey === "erc20-token" || tKey === "meme-token") {
    if (cfg.totalSupply)  rows.push({ label: "Total Supply",   value: Number(cfg.totalSupply).toLocaleString() });
    if (cfg.symbol)       rows.push({ label: "Symbol",         value: `$${cfg.symbol}` });
    if (cfg.mintable === "true") rows.push({ label: "Mintable", value: "Yes" });
    if (cfg.burnable === "true") rows.push({ label: "Burnable", value: "Yes" });
    if (cfg.taxPct)       rows.push({ label: "Transfer Tax",   value: `${cfg.taxPct}%` });
  } else if (tKey === "nft-collection") {
    if (cfg.maxSupply)    rows.push({ label: "Max Supply",     value: Number(cfg.maxSupply).toLocaleString() });
    if (cfg.mintPrice)    rows.push({ label: "Mint Price",     value: `${cfg.mintPrice} ETH` });
    if (cfg.royaltyBps)   rows.push({ label: "Royalties",      value: `${Number(cfg.royaltyBps) / 100}%` });
  } else if (tKey === "dao-governance") {
    if (cfg.quorum)       rows.push({ label: "Quorum",         value: `${cfg.quorum}%` });
    if (cfg.votingPeriod) rows.push({ label: "Voting Period",  value: `${cfg.votingPeriod} days` });
  } else if (tKey === "staking-dashboard") {
    if (cfg.apy)          rows.push({ label: "APY",            value: `${cfg.apy}%` });
    if (cfg.lockPeriod)   rows.push({ label: "Lock Period",    value: `${cfg.lockPeriod} days` });
  }

  if (rows.length === 0) return null;

  return (
    <section className="max-w-2xl mx-auto w-full px-4 pb-10">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Contract Details</p>
        <dl className="divide-y divide-gray-100">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-gray-500">{r.label}</dt>
              <dd className="text-sm font-semibold text-gray-900">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
