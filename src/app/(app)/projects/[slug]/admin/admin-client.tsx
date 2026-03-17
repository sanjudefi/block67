"use client";
/**
 * Admin Client — Site management panel for project owners.
 *
 * Tabs:
 *   Site Settings  — edit frontend-only fields (name, color, description, links)
 *   Visitors       — wallets that connected to the live dApp
 *   Live Preview   — iframe of the actual live site
 */

import { useState, useEffect } from "react";
import Link                    from "next/link";
import {
  ArrowLeft, ExternalLink, Globe, Palette, Users, Eye,
  Save, CheckCircle2, Loader2, Copy, Zap,
} from "lucide-react";

// ── Frontend-editable fields per template ─────────────────────────────────────
// These are display/branding fields only — contract parameters (supply, ABI,
// APY, max supply, etc.) cannot be changed post-deploy and are NOT shown here.

interface FrontendField {
  key: string; label: string;
  type: "text" | "textarea" | "color" | "url";
  placeholder?: string;
}

const FRONTEND_FIELDS: Record<string, FrontendField[]> = {
  "erc20-token": [
    { key: "tokenName",   label: "Token Name",    type: "text",     placeholder: "e.g. MyToken" },
    { key: "symbol",      label: "Ticker Symbol", type: "text",     placeholder: "e.g. MTK" },
    { key: "description", label: "Description",   type: "textarea", placeholder: "Tell people what this token is about" },
    { key: "website",     label: "Website URL",   type: "url",      placeholder: "https://yourtoken.com" },
    { key: "accentColor", label: "Brand Color",   type: "color" },
  ],
  "meme-token": [
    { key: "tokenName",   label: "Token Name",    type: "text",     placeholder: "e.g. PepeCoin" },
    { key: "symbol",      label: "Ticker Symbol", type: "text",     placeholder: "e.g. PEPE" },
    { key: "description", label: "Description",   type: "textarea", placeholder: "The story of your meme coin" },
    { key: "website",     label: "Website URL",   type: "url",      placeholder: "https://yourtoken.com" },
    { key: "accentColor", label: "Brand Color",   type: "color" },
  ],
  "nft-collection": [
    { key: "collectionName", label: "Collection Name", type: "text",     placeholder: "e.g. Cool Apes" },
    { key: "symbol",         label: "Symbol",          type: "text",     placeholder: "e.g. CAPE" },
    { key: "description",    label: "Description",     type: "textarea", placeholder: "About your NFT collection" },
    { key: "website",        label: "Website URL",     type: "url",      placeholder: "https://yourproject.com" },
    { key: "accentColor",    label: "Brand Color",     type: "color" },
  ],
  "dao-governance": [
    { key: "daoName",     label: "DAO Name",      type: "text",     placeholder: "e.g. MyDAO" },
    { key: "tokenName",   label: "Token Name",    type: "text",     placeholder: "e.g. Governance Token" },
    { key: "description", label: "Description",   type: "textarea", placeholder: "What does this DAO govern?" },
    { key: "website",     label: "Website URL",   type: "url",      placeholder: "https://yourdao.com" },
    { key: "accentColor", label: "Brand Color",   type: "color" },
  ],
  "staking-dashboard": [
    { key: "tokenName",   label: "Platform Name", type: "text",     placeholder: "e.g. MyStaking" },
    { key: "description", label: "Description",   type: "textarea", placeholder: "About your staking platform" },
    { key: "website",     label: "Website URL",   type: "url",      placeholder: "https://yourstaking.com" },
    { key: "accentColor", label: "Brand Color",   type: "color" },
  ],
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface DAppUser {
  id: string;
  walletAddress: string;
  firstSeenAt: string;
  lastSeenAt:  string;
}

interface Deployment {
  contractAddress: string;
  chainName:       string;
  explorerUrl:     string;
  txHash:          string;
  deployedAt:      string;
}

interface Props {
  projectId:    string;
  projectSlug:  string;
  projectName:  string;
  templateKey:  string;
  config:       Record<string, string>;
  deployment:   Deployment | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function shortenAddr(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }

// ── Main component ─────────────────────────────────────────────────────────────

export function AdminClient({ projectId, projectSlug, projectName, templateKey, config, deployment }: Props) {
  const [tab,     setTab]     = useState<"settings" | "visitors" | "preview">("settings");
  const [fields,  setFields]  = useState<Record<string, string>>({ ...config });
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [users,   setUsers]   = useState<DAppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [copied,  setCopied]  = useState(false);

  const liveUrl    = `https://${projectSlug}.block67.app`;
  const editFields = FRONTEND_FIELDS[templateKey] ?? FRONTEND_FIELDS["erc20-token"];

  // Load visitors when that tab opens
  useEffect(() => {
    if (tab !== "visitors" || users.length > 0) return;
    setLoadingUsers(true);
    fetch(`/api/projects/${projectId}/dapp-users`)
      .then((r) => r.json())
      .then((d) => { setUsers(d.users ?? []); })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [tab, projectId, users.length]);

  async function saveSettings() {
    setSaving(true);
    setSaved(false);
    setSaveErr("");
    try {
      // Merge updated frontend fields into the full config (preserve contract params)
      const updatedConfig = { ...config, ...fields };
      const res = await fetch(`/api/projects/${projectId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ paramValues: updatedConfig }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{projectName}</p>
            <p className="text-xs text-gray-400">Site Management</p>
          </div>
          {/* Live site badge */}
          <a href={liveUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {projectSlug}.block67.app
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* ── Tabs ── */}
        <div className="max-w-3xl mx-auto px-4 flex gap-0 border-t border-gray-100">
          {([
            { id: "settings", icon: Palette,  label: "Edit Site"  },
            { id: "visitors", icon: Users,    label: "Visitors"   },
            { id: "preview",  icon: Eye,      label: "Preview"    },
          ] as { id: typeof tab; icon: React.ElementType; label: string }[]).map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                tab === id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ── SETTINGS TAB ──────────────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="space-y-4">
            {/* Info banner */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700 flex items-start gap-2">
              <Zap className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
              <div>
                <strong>Frontend settings only.</strong>{" "}
                These fields control how your site looks and feels. Contract parameters (supply, APY, mint price, etc.) are locked on-chain and cannot be changed here.
                Changes publish instantly to{" "}
                <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="underline">{liveUrl}</a>.
              </div>
            </div>

            {/* Contract info (read-only) */}
            {deployment && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Deployed Contract</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-gray-700 flex-1 truncate">{deployment.contractAddress}</code>
                  <button onClick={() => { navigator.clipboard.writeText(deployment.contractAddress); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />}
                  </button>
                  <a href={`${deployment.explorerUrl}/address/${deployment.contractAddress}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-600" />
                  </a>
                </div>
                <p className="text-[11px] text-gray-400">{deployment.chainName} · Deployed {timeAgo(deployment.deployedAt)}</p>
              </div>
            )}

            {/* Editable fields */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-500" /> Site Appearance & Info
              </h2>

              {editFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={fields[field.key] ?? ""}
                      onChange={(e) => setFields((f) => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-indigo-400 resize-none transition-colors"
                    />
                  ) : field.type === "color" ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={fields[field.key] ?? "#6366f1"}
                        onChange={(e) => setFields((f) => ({ ...f, [field.key]: e.target.value }))}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={fields[field.key] ?? "#6366f1"}
                        onChange={(e) => setFields((f) => ({ ...f, [field.key]: e.target.value }))}
                        placeholder="#6366f1"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-900 outline-none focus:border-indigo-400 transition-colors"
                      />
                      {/* Preview swatch */}
                      <div className="w-8 h-8 rounded-lg border border-gray-100 shadow-sm"
                        style={{ background: fields[field.key] ?? "#6366f1" }} />
                    </div>
                  ) : (
                    <input
                      type={field.type === "url" ? "url" : "text"}
                      value={fields[field.key] ?? ""}
                      onChange={(e) => setFields((f) => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-indigo-400 transition-colors"
                    />
                  )}
                </div>
              ))}

              {/* Error */}
              {saveErr && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveErr}</p>
              )}

              {/* Save button */}
              <button
                onClick={saveSettings}
                disabled={saving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : saved ? (
                  <><CheckCircle2 className="w-4 h-4 text-emerald-300" /> Saved &amp; Published!</>
                ) : (
                  <><Save className="w-4 h-4" /> Save &amp; Publish to Live Site</>
                )}
              </button>

              {saved && (
                <div className="text-center">
                  <a href={liveUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:underline flex items-center justify-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> See changes live →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VISITORS TAB ─────────────────────────────────────────────────── */}
        {tab === "visitors" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" /> Wallet Visitors
                </h2>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {users.length} total
                </span>
              </div>

              {loadingUsers ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading visitors…
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-3">👋</p>
                  <p className="text-sm font-medium text-gray-600 mb-1">No visitors yet</p>
                  <p className="text-xs">When users connect MetaMask on your live site, they&apos;ll appear here.</p>
                  <a href={liveUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-4 text-xs text-indigo-600 hover:underline font-semibold">
                    Share your live site <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="space-y-1">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-indigo-600">
                          {u.walletAddress.slice(2, 4).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-gray-900 truncate">
                          {shortenAddr(u.walletAddress)}
                        </p>
                        <p className="text-xs text-gray-400">
                          First seen {timeAgo(u.firstSeenAt)} · Last {timeAgo(u.lastSeenAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => navigator.clipboard.writeText(u.walletAddress)}
                          className="text-gray-300 hover:text-gray-600">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {deployment && (
                          <a href={`${deployment.explorerUrl}/address/${u.walletAddress}`}
                            target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-indigo-600">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PREVIEW TAB ──────────────────────────────────────────────────── */}
        {tab === "preview" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Live preview of your published dApp</p>
              <a href={liveUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Open full page <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
              style={{ height: "680px" }}>
              <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500 font-mono">
                  {liveUrl}
                </div>
              </div>
              <iframe
                src={liveUrl}
                className="w-full"
                style={{ height: "calc(100% - 40px)", border: "none" }}
                title={`${projectName} live preview`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
