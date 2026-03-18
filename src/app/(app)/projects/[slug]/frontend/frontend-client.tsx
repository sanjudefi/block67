"use client";
/**
 * Frontend Editor — Block67 Intelligence AI chat + live iframe preview
 *
 * Layout:
 *  ┌─ Top bar: project name + device picker ──────────────────────────┐
 *  ├─ Left (360px): Chat / Sections tabs ─┬─ Right: Live preview ─────┤
 *  │                                       │  [URL bar]                │
 *  │  Chat or Section forms                │  [iframe]                 │
 *  │                                       │                           │
 *  ├─ Bottom action bar: Save + Publish ──────────────────────────────┤
 *  └──────────────────────────────────────────────────────────────────┘
 *
 * Key correctness fixes vs previous version:
 *  - useRef never called inside JSX
 *  - doSave reads latestRef.current (no stale closure)
 *  - doSave/toggleSection/saveTeam/saveFaq never called inside setState updater
 *  - iframe uses Date.now() cache-buster so browser never serves stale HTML
 *  - Save + Publish live in a fixed bottom bar — always visible
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Send, Loader2, RefreshCw, ExternalLink,
  Globe, Palette, MessageSquare, Zap, CheckCircle2,
  Monitor, Tablet, Smartphone, Users, MessageCircle,
  HelpCircle, Mail, Share2, Settings, Plus, Trash2,
  Rocket, Eye, History, RotateCcw, Copy, Check, Lock,
} from "lucide-react";
import { DomainModal }  from "@/components/DomainModal";
import { UpgradeModal } from "@/components/UpgradeModal";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:   string;
  role: "user" | "assistant";
  text: string;
  ts:   Date;
}

type ViewMode = "desktop" | "tablet" | "mobile";

interface TeamMember { name: string; role: string; bio?: string; twitter?: string; photo?: string; }
interface FaqItem    { q: string; a: string; }

interface HistoryEntry {
  id:        string;
  ts:        Date;
  label:     string;   // human-readable e.g. "Background: #0a0a0f → #1a1a2e"
  snapshot:  Record<string, string>;
}

// ── Section Panel ─────────────────────────────────────────────────────────────
// Defined BEFORE FrontendClient so React never sees it as "undefined"

function SectionPanel({ icon, label, description, enabled, onToggle, children }: {
  icon: React.ReactNode; label: string; description: string;
  enabled: boolean; onToggle: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-3 px-3 py-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
          ${enabled ? "bg-violet-600" : "bg-white/10"}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-[11px] text-white/40 truncate">{description}</p>
        </div>
        <button onClick={onToggle}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-lg transition-colors
            ${enabled
              ? "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30"
              : "bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30"
            }`}>
          {enabled ? "−" : "+"}
        </button>
      </div>
      {enabled && children && (
        <div className="border-t border-white/10 px-3 pb-3 pt-2">{children}</div>
      )}
    </div>
  );
}

// ── Quick-edit field config ───────────────────────────────────────────────────

const QUICK_FIELDS: Record<string, Array<{ key: string; label: string; type: "text" | "textarea" | "color" | "url" }>> = {
  "erc20-token":       [
    { key: "tokenName",   label: "Token Name",  type: "text"     },
    { key: "description", label: "Description", type: "textarea" },
    { key: "website",     label: "Website",      type: "url"      },
    { key: "accentColor", label: "Accent Color", type: "color"    },
    { key: "_bgColor",    label: "Background",   type: "color"    },
  ],
  "meme-token":        [
    { key: "tokenName",   label: "Token Name",  type: "text"     },
    { key: "description", label: "Description", type: "textarea" },
    { key: "website",     label: "Website",      type: "url"      },
    { key: "accentColor", label: "Accent Color", type: "color"    },
    { key: "_bgColor",    label: "Background",   type: "color"    },
  ],
  "nft-collection":    [
    { key: "collectionName", label: "Name",         type: "text"     },
    { key: "description",    label: "Description",  type: "textarea" },
    { key: "website",        label: "Website",       type: "url"      },
    { key: "accentColor",    label: "Accent Color",  type: "color"    },
    { key: "_bgColor",       label: "Background",    type: "color"    },
  ],
  "dao-governance":    [
    { key: "daoName",     label: "DAO Name",     type: "text"     },
    { key: "description", label: "Description",  type: "textarea" },
    { key: "website",     label: "Website",       type: "url"      },
    { key: "accentColor", label: "Accent Color",  type: "color"    },
    { key: "_bgColor",    label: "Background",    type: "color"    },
  ],
  "staking-dashboard": [
    { key: "tokenName",   label: "Platform Name", type: "text"     },
    { key: "description", label: "Description",   type: "textarea" },
    { key: "website",     label: "Website",        type: "url"      },
    { key: "accentColor", label: "Accent Color",   type: "color"    },
    { key: "_bgColor",    label: "Background",     type: "color"    },
  ],
};

// ── AI Responses ──────────────────────────────────────────────────────────────

function aiResponse(msg: string, activeSections: string[]): { text: string; tab?: "sections" } {
  const m = msg.toLowerCase();
  if (m.includes("team") || m.includes("people") || m.includes("founder"))
    return { text: activeSections.includes("team")
      ? "Team section is already enabled! Go to the **Sections** tab to edit members."
      : "Switch to **Sections** tab and click **+** next to Team Members to add your founders.",
      tab: "sections" };
  if (m.includes("faq") || m.includes("question"))
    return { text: activeSections.includes("faq")
      ? "FAQ is active — go to **Sections** tab to edit Q&As."
      : "Go to **Sections** tab, enable FAQ, then click **Auto-generate 4 FAQs** to start.",
      tab: "sections" };
  if (m.includes("whatsapp") || m.includes("contact") || m.includes("phone"))
    return { text: "Add WhatsApp and contact info in the **Sections** tab.", tab: "sections" };
  if (m.includes("social") || m.includes("twitter") || m.includes("telegram"))
    return { text: "Social links are in the **Sections** tab.", tab: "sections" };
  if (m.includes("color") || m.includes("theme") || m.includes("background") || m.includes("bg"))
    return { text: "Use the **Accent Color** and **Background** pickers in the strip at the top. Changes save automatically." };
  if (m.includes("description") || m.includes("about"))
    return { text: "Update your **Description** in the quick-edit strip above." };
  if (m.includes("publish") || m.includes("live") || m.includes("go live"))
    return { text: "Click the green **Publish Live** button at the bottom of this page to make your site public." };
  if (m.includes("save") || m.includes("preview"))
    return { text: "Changes auto-save after 1.5 seconds of inactivity. Click **Save Now** at the bottom to save immediately — the preview updates right after." };
  if (m.includes("section") || m.includes("add"))
    return { text: "Switch to the **Sections** tab to add team, FAQ, contact info, social links, and WhatsApp.", tab: "sections" };
  return { text: `I'm Block67 Intelligence — your frontend design assistant.\n\nWhat I can help with:\n• **Quick edits** — name, description, accent color, background\n• **Sections** — team, FAQ, contact, social, WhatsApp\n• **Publishing** — make your site live\n\nWhat would you like to change?` };
}

// ── Input field ───────────────────────────────────────────────────────────────

function FieldInput({ value, onChange, placeholder, type = "text", className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: "text" | "url"; className?: string;
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full text-xs px-2.5 py-2 rounded-lg outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50 transition-colors ${className}`}
    />
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function FrontendClient({
  projectId, projectSlug, projectName, templateKey, config: initialConfig, isLive, siteUrl, subdomainUrl, isPro,
}: {
  projectId: string; projectSlug: string; projectName: string;
  templateKey: string; config: Record<string, string>; isLive: boolean;
  siteUrl?: string; subdomainUrl?: string; isPro?: boolean;
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [savedConfig,    setSavedConfig]    = useState<Record<string, string>>(initialConfig);
  const [dirty,          setDirty]          = useState<Record<string, string>>({});
  const [saving,         setSaving]         = useState(false);
  const [saveStatus,     setSaveStatus]     = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [publishing,     setPublishing]     = useState(false);
  const [live,           setLive]           = useState(isLive);
  // Track whether the current saved draft differs from the last published snapshot.
  // publishedClean = true means "published and no new draft changes since" → disable Publish.
  const [publishedClean, setPublishedClean] = useState(() => {
    // On mount: if already live and _publishedSnapshot matches paramValues, start clean
    const snap = initialConfig._publishedSnapshot;
    if (!snap || !isLive) return false;
    try {
      const pub = JSON.parse(snap) as Record<string, string>;
      const { _publishedSnapshot: _x, ...draft } = initialConfig;
      return JSON.stringify(draft) === JSON.stringify(pub);
    } catch { return false; }
  });
  const [urlCopied,      setUrlCopied]      = useState(false);
  const [iframeKey,      setIframeKey]      = useState(0);
  const [showDomain,     setShowDomain]     = useState(false);
  const [showUpgrade,    setShowUpgrade]    = useState(false);
  // Preview iframe always loads the DRAFT version (?preview=1)
  // Live site (/site/slug without preview param) reads the published snapshot only.
  const [iframeSrc,      setIframeSrc]      = useState(`/site/${projectSlug}?preview=1&_t=${Date.now()}`);
  // Change history — last 15 saved states
  const [history,        setHistory]        = useState<HistoryEntry[]>([]);
  const [showHistory,    setShowHistory]    = useState(false);
  const [leftTab,     setLeftTab]     = useState<"chat" | "sections">("chat");
  const [viewMode,    setViewMode]    = useState<ViewMode>("desktop");
  const [msgs,        setMsgs]        = useState<ChatMessage[]>([{
    id: "welcome", role: "assistant", ts: new Date(),
    text: `Hi! I'm Block67 Intelligence for **${projectName}**.\n\nEdit the fields above, then click **Save Now** below. The preview updates instantly after save.\n\nSwitch to **Sections** to add team, FAQ, contact info, and social links.`,
  }]);
  const [input,       setInput]       = useState("");
  const [thinking,    setThinking]    = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    try { return JSON.parse(initialConfig._team_json || "[]"); } catch { return []; }
  });
  const [faqItems,    setFaqItems]    = useState<FaqItem[]>(() => {
    try { return JSON.parse(initialConfig._faq_json || "[]"); } catch { return []; }
  });
  const [genFaq,      setGenFaq]      = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const chatEndRef  = useRef<HTMLDivElement>(null);
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // latestRef — always holds the full merged config, updated synchronously.
  // doSave reads from this to avoid stale closure bugs.
  const latestRef   = useRef<Record<string, string>>(initialConfig);

  const merged         = { ...savedConfig, ...dirty };
  const activeSections = (merged._sections || "").split(",").map(s => s.trim()).filter(Boolean);
  const quickFields    = QUICK_FIELDS[templateKey] ?? QUICK_FIELDS["erc20-token"];
  const hasDirty       = Object.keys(dirty).length > 0;
  // Use the server-computed siteUrl (correct for all environments — Vercel preview, prod, localhost).
  // Fall back to /site/slug if somehow not passed.
  const liveUrl        = siteUrl ?? `/site/${projectSlug}`;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // ── Core: save to DB ───────────────────────────────────────────────────────
  const doSave = useCallback(async () => {
    const snapshot = { ...latestRef.current }; // snapshot to avoid mutations during async
    setSaving(true);
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ paramValues: snapshot }),
      });
      if (res.ok) {
        // Push to change history before overwriting savedConfig
        setSavedConfig(prev => {
          const changes: string[] = [];
          const LABELS: Record<string, string> = {
            tokenName: "Token Name", collectionName: "Name", daoName: "DAO Name",
            description: "Description", accentColor: "Accent Color", _bgColor: "Background",
            website: "Website", _sections: "Sections",
          };
          for (const [k, v] of Object.entries(snapshot)) {
            if (k === "_publishedSnapshot") continue;
            const old = prev[k];
            if (old !== undefined && old !== v) {
              const label = LABELS[k] || k;
              const oldStr = old.length > 20 ? old.slice(0, 18) + "…" : old;
              const newStr = v.length > 20 ? v.slice(0, 18) + "…" : v;
              changes.push(`${label}: ${oldStr || "(empty)"} → ${newStr || "(empty)"}`);
            }
          }
          if (changes.length > 0) {
            const entry: HistoryEntry = {
              id:       Date.now().toString(),
              ts:       new Date(),
              label:    changes.slice(0, 2).join(" · ") + (changes.length > 2 ? ` +${changes.length - 2} more` : ""),
              snapshot: { ...snapshot },
            };
            setHistory(h => [entry, ...h].slice(0, 15));
          }
          return snapshot;
        });
        setDirty({});
        setSaveStatus("saved");
        setPublishedClean(false); // draft changed since last publish
        // Reload preview iframe (draft mode) with fresh timestamp
        const freshSrc = `/site/${projectSlug}?preview=1&_t=${Date.now()}`;
        setIframeSrc(freshSrc);
        setIframeKey(k => k + 1);
        setTimeout(() => setSaveStatus("idle"), 4000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }, [projectId, projectSlug]);

  // Debounced auto-save
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 1500);
  }, [doSave]);

  // setField: update a single config key, schedule save
  const setField = useCallback((key: string, val: string) => {
    latestRef.current = { ...latestRef.current, [key]: val };
    setDirty(prev => ({ ...prev, [key]: val }));
    setPublishedClean(false);
    scheduleSave();
  }, [scheduleSave]);

  // toggleSection: immediate save (no debounce)
  const toggleSection = useCallback((key: string) => {
    const curr = new Set((latestRef.current._sections || "").split(",").map(s => s.trim()).filter(Boolean));
    if (curr.has(key)) curr.delete(key); else curr.add(key);
    const val = Array.from(curr).join(",");
    latestRef.current = { ...latestRef.current, _sections: val };
    setDirty(prev => ({ ...prev, _sections: val }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 150);
  }, [doSave]);

  const saveTeam = useCallback((members: TeamMember[]) => {
    const json = JSON.stringify(members);
    latestRef.current = { ...latestRef.current, _team_json: json };
    setDirty(prev => ({ ...prev, _team_json: json }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 800);
  }, [doSave]);

  const saveFaq = useCallback((items: FaqItem[]) => {
    const json = JSON.stringify(items);
    latestRef.current = { ...latestRef.current, _faq_json: json };
    setDirty(prev => ({ ...prev, _faq_json: json }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 800);
  }, [doSave]);

  const generateFaq = useCallback(() => {
    setGenFaq(true);
    const name = latestRef.current.tokenName || latestRef.current.collectionName || latestRef.current.daoName || projectName;
    const samples: FaqItem[] = [
      { q: `What is ${name}?`,         a: `${name} is a decentralized project built on blockchain technology, giving users full ownership and transparency.` },
      { q: "How do I get started?",    a: "Connect your MetaMask wallet and interact with the smart contract directly from this page." },
      { q: "Is this project audited?", a: "Our smart contracts are built on OpenZeppelin v5 standards — the gold standard for secure Solidity development." },
      { q: "Where can I get support?", a: "Reach out through our social channels or contact email. Our community is always here to help." },
    ];
    setTimeout(() => { setFaqItems(samples); saveFaq(samples); setGenFaq(false); }, 800);
  }, [projectName, saveFaq]);

  const publishLive = useCallback(async () => {
    setPublishing(true);
    try {
      // 1. Save any pending draft changes first
      await doSave();
      // 2. Snapshot draft → published (Webflow-style explicit publish)
      //    POST /api/projects/[id]/publish copies paramValues → _publishedSnapshot
      //    and sets status = ACTIVE. The live site reads _publishedSnapshot only.
      const res = await fetch(`/api/projects/${projectId}/publish`, {
        method: "POST",
      });
      if (res.ok) {
        setLive(true);
        setPublishedClean(true); // mark as clean — no new changes since publish
      }
    } finally { setPublishing(false); }
  }, [doSave, projectId]);

  const sendMsg = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    setMsgs(p => [...p, { id: Date.now().toString(), role: "user", text, ts: new Date() }]);
    setThinking(true);
    await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
    const { text: aiText, tab } = aiResponse(text, activeSections);
    if (tab) setLeftTab(tab);
    setMsgs(p => [...p, { id: (Date.now()+1).toString(), role: "assistant", text: aiText, ts: new Date() }]);
    setThinking(false);
  }, [input, thinking, activeSections]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  const iframeWidth = viewMode === "tablet" ? "768px" : viewMode === "mobile" ? "390px" : "100%";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">

      {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <header className="h-14 border-b border-white/10 flex items-center gap-3 px-4 shrink-0"
        style={{ background: "rgba(10,10,15,0.97)" }}>
        <Link href={`/projects/${projectSlug}`}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs hidden sm:block">Back</span>
        </Link>
        <Palette className="w-4 h-4 text-violet-400 shrink-0" />
        <span className="font-semibold text-sm text-white truncate max-w-[120px]">{projectName}</span>

        {/* ── Subdomain URL pill — always visible ─────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0 ml-1">
          {live ? (
            /* Published / live state */
            <div className="flex items-center gap-1.5 border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Live</span>
              <a href={liveUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-emerald-300/80 hover:text-emerald-300 font-mono truncate max-w-[180px] hidden md:block">
                {subdomainUrl ?? liveUrl.replace("https://", "")}
              </a>
              <button
                onClick={() => { navigator.clipboard.writeText(liveUrl); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000); }}
                title="Copy URL" className="text-emerald-400 hover:text-emerald-300 shrink-0">
                {urlCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
              <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 shrink-0">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            /* Not yet published */
            <div className="flex items-center gap-1.5 border border-white/10 bg-white/5 px-2.5 py-1.5 rounded-xl">
              <Globe className="w-3 h-3 text-white/30 shrink-0" />
              <span className="text-xs text-white/40 font-mono truncate max-w-[180px] hidden md:block">
                {subdomainUrl ?? `${projectSlug}.block67.app`}
              </span>
              <span className="text-[10px] text-white/30 shrink-0">· Not published</span>
            </div>
          )}

          {/* Add my domain button */}
          <button
            onClick={() => isPro ? setShowDomain(true) : setShowUpgrade(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0"
            style={{
              background: isPro ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)",
              border: isPro ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(255,255,255,0.10)",
              color: isPro ? "#c4b5fd" : "rgba(255,255,255,0.35)",
            }}
            title={isPro ? "Connect your custom domain" : "Upgrade to Premium for custom domains"}>
            <Globe className="w-3 h-3" />
            <span className="hidden sm:block">Add my domain</span>
            {!isPro && <Lock className="w-2.5 h-2.5 opacity-60" />}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {(["desktop","tablet","mobile"] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-2 py-1.5 rounded text-xs transition-colors ${viewMode === m ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"}`}>
              {m === "desktop" ? <Monitor className="w-3.5 h-3.5" /> : m === "tablet" ? <Tablet className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </header>

      {/* ══ QUICK-EDIT STRIP ═════════════════════════════════════════════════ */}
      <div className="border-b border-white/10 px-4 py-2 flex items-end gap-4 overflow-x-auto shrink-0"
        style={{ background: "rgba(15,15,22,0.98)" }}>
        {quickFields.map(f => (
          <div key={f.key} className="shrink-0">
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">{f.label}</label>
            {f.type === "color" ? (
              <div className="flex items-center gap-1.5">
                <input type="color"
                  value={merged[f.key] || (f.key === "_bgColor" ? "#0a0a0f" : "#6366f1")}
                  onChange={e => setField(f.key, e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 bg-transparent" />
                <span className="text-[11px] text-white/40 font-mono">
                  {merged[f.key] || (f.key === "_bgColor" ? "#0a0a0f" : "#6366f1")}
                </span>
              </div>
            ) : f.type === "textarea" ? (
              <textarea value={merged[f.key] || ""} onChange={e => setField(f.key, e.target.value)}
                placeholder={`${f.label}…`} rows={2}
                className="w-52 text-xs rounded-lg px-2.5 py-1.5 outline-none resize-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
            ) : (
              <input type={f.type === "url" ? "url" : "text"} value={merged[f.key] || ""}
                onChange={e => setField(f.key, e.target.value)} placeholder={`${f.label}…`}
                className="w-40 text-xs rounded-lg px-2.5 py-1.5 outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
            )}
          </div>
        ))}
        <button onClick={() => { const s = `/site/${projectSlug}?preview=1&_t=${Date.now()}`; setIframeSrc(s); setIframeKey(k=>k+1); }}
          className="ml-auto shrink-0 flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 border border-white/15 px-2.5 py-1.5 rounded-lg transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ══ MAIN AREA ════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel: Chat / Sections ─────────────────────────────────── */}
        <aside className="w-[340px] shrink-0 border-r border-white/10 flex flex-col overflow-hidden"
          style={{ background: "rgba(12,12,18,0.99)" }}>

          {/* Tabs */}
          <div className="flex border-b border-white/10 shrink-0">
            {(["chat", "sections"] as const).map(tab => (
              <button key={tab} onClick={() => setLeftTab(tab)}
                className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors
                  ${leftTab === tab ? "text-violet-400 border-b-2 border-violet-500 bg-violet-500/5" : "text-white/40 hover:text-white/60"}`}>
                {tab === "chat"
                  ? <><MessageSquare className="w-3.5 h-3.5" /> AI Chat</>
                  : <><Settings className="w-3.5 h-3.5" /> Sections</>}
              </button>
            ))}
          </div>

          {/* ── Chat tab ── */}
          {leftTab === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {msgs.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[90%]">
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                            <Zap className="w-2.5 h-2.5 text-white" />
                          </div>
                          <span className="text-[10px] text-white/40">Block67 Intelligence</span>
                        </div>
                      )}
                      <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap
                        ${msg.role === "user" ? "bg-violet-600 text-white" : "text-white/85 border border-white/10"}`}
                        style={msg.role === "assistant" ? { background: "rgba(255,255,255,0.05)" } : {}}>
                        {msg.text.split("**").map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}
                      </div>
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-2.5 border-t border-white/10 shrink-0">
                <div className="flex gap-2">
                  <textarea ref={textareaRef} value={input}
                    onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="Ask about sections, colors, team, FAQ…"
                    rows={2}
                    className="flex-1 text-xs rounded-xl px-2.5 py-2 outline-none resize-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
                  <button onClick={sendMsg} disabled={!input.trim() || thinking}
                    className="w-8 h-8 mt-auto bg-violet-600 hover:bg-violet-500 disabled:opacity-30 rounded-xl flex items-center justify-center transition-colors">
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Sections tab ── */}
          {leftTab === "sections" && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 space-y-3">

                {/* Team */}
                <SectionPanel icon={<Users className="w-4 h-4" />} label="Team Members"
                  description="Founders and core team" enabled={activeSections.includes("team")}
                  onToggle={() => toggleSection("team")}>
                  <div className="space-y-3">
                    {teamMembers.map((m, i) => (
                      <div key={i} className="rounded-lg p-2.5 space-y-2"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Member {i+1}</span>
                          <button onClick={() => { const n = teamMembers.filter((_,j) => j!==i); setTeamMembers(n); saveTeam(n); }}
                            className="text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                        </div>
                        <FieldInput value={m.name} placeholder="Full name"
                          onChange={v => { const n=[...teamMembers]; n[i]={...n[i],name:v}; setTeamMembers(n); saveTeam(n); }} />
                        <FieldInput value={m.role} placeholder="Role / Designation"
                          onChange={v => { const n=[...teamMembers]; n[i]={...n[i],role:v}; setTeamMembers(n); saveTeam(n); }} />
                        <FieldInput value={m.twitter||""} placeholder="@twitter (optional)"
                          onChange={v => { const n=[...teamMembers]; n[i]={...n[i],twitter:v}; setTeamMembers(n); saveTeam(n); }} />
                        <FieldInput value={m.photo||""} placeholder="Photo URL (optional)"
                          onChange={v => { const n=[...teamMembers]; n[i]={...n[i],photo:v}; setTeamMembers(n); saveTeam(n); }} />
                      </div>
                    ))}
                    <button onClick={() => { const n=[...teamMembers,{name:"",role:""}]; setTeamMembers(n); saveTeam(n); }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add Team Member
                    </button>
                  </div>
                </SectionPanel>

                {/* FAQ */}
                <SectionPanel icon={<HelpCircle className="w-4 h-4" />} label="FAQ"
                  description="Questions about your project" enabled={activeSections.includes("faq")}
                  onToggle={() => toggleSection("faq")}>
                  <div className="space-y-3">
                    {faqItems.length === 0 && (
                      <button onClick={generateFaq} disabled={genFaq}
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl text-white disabled:opacity-50"
                        style={{ background: "rgba(139,92,246,0.3)", border: "1px solid rgba(139,92,246,0.4)" }}>
                        {genFaq ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        {genFaq ? "Generating…" : "Auto-generate 4 FAQs"}
                      </button>
                    )}
                    {faqItems.map((item, i) => (
                      <div key={i} className="rounded-lg p-2.5 space-y-2"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/40 font-semibold uppercase">FAQ {i+1}</span>
                          <button onClick={() => { const n=faqItems.filter((_,j)=>j!==i); setFaqItems(n); saveFaq(n); }}
                            className="text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                        </div>
                        <FieldInput value={item.q} placeholder="Question"
                          onChange={v => { const n=[...faqItems]; n[i]={...n[i],q:v}; setFaqItems(n); saveFaq(n); }} />
                        <textarea value={item.a}
                          onChange={e => { const n=[...faqItems]; n[i]={...n[i],a:e.target.value}; setFaqItems(n); saveFaq(n); }}
                          placeholder="Answer" rows={2}
                          className="w-full text-xs px-2.5 py-2 rounded-lg outline-none resize-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
                      </div>
                    ))}
                    <button onClick={() => { const n=[...faqItems,{q:"",a:""}]; setFaqItems(n); saveFaq(n); }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add FAQ
                    </button>
                  </div>
                </SectionPanel>

                {/* Contact */}
                <SectionPanel icon={<Mail className="w-4 h-4" />} label="Contact"
                  description="Email, phone, address" enabled={activeSections.includes("contact")}
                  onToggle={() => toggleSection("contact")}>
                  <div className="space-y-2">
                    {[
                      { key: "_contact_email",    label: "Email",   ph: "hello@yourproject.com" },
                      { key: "_contact_phone",    label: "Phone",   ph: "+1 (555) 000-0000" },
                      { key: "_contact_location", label: "City",    ph: "New York, USA" },
                      { key: "_contact_address",  label: "Address", ph: "123 Main St" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">{f.label}</label>
                        <FieldInput value={merged[f.key]||""} placeholder={f.ph} onChange={v => setField(f.key, v)} />
                      </div>
                    ))}
                  </div>
                </SectionPanel>

                {/* Social */}
                <SectionPanel icon={<Share2 className="w-4 h-4" />} label="Social Links"
                  description="Twitter, Telegram, Discord, GitHub" enabled={activeSections.includes("social")}
                  onToggle={() => toggleSection("social")}>
                  <div className="space-y-2">
                    {[
                      { key: "_social_twitter",  label: "Twitter / X",  ph: "@yourhandle" },
                      { key: "_social_telegram", label: "Telegram",      ph: "@group or t.me/…" },
                      { key: "_social_discord",  label: "Discord",       ph: "discord.gg/invite" },
                      { key: "_social_github",   label: "GitHub",        ph: "yourusername" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">{f.label}</label>
                        <FieldInput value={merged[f.key]||""} placeholder={f.ph} onChange={v => setField(f.key, v)} />
                      </div>
                    ))}
                  </div>
                </SectionPanel>

                {/* WhatsApp */}
                <SectionPanel icon={<MessageCircle className="w-4 h-4" />} label="WhatsApp Button"
                  description="Floating chat button on site" enabled={activeSections.includes("whatsapp")}
                  onToggle={() => toggleSection("whatsapp")}>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">WhatsApp Number</label>
                    <FieldInput value={merged._whatsapp||""} placeholder="+1234567890 (with country code)"
                      onChange={v => setField("_whatsapp", v)} />
                  </div>
                </SectionPanel>

              </div>
            </div>
          )}
        </aside>

        {/* ── Right panel: Preview ─────────────────────────────────────────── */}
        <main className="flex-1 overflow-hidden flex flex-col p-3 gap-2 relative" style={{ background: "#0d0d14" }}>
          {/* Status bar */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 min-w-0">
              <Eye className="w-3 h-3 text-white/30 shrink-0" />
              <span className="text-xs text-white/40 font-mono truncate">
                Preview — publishes to{" "}
                <span className="text-violet-400/70">{subdomainUrl ?? `${projectSlug}.block67.app`}</span>
              </span>
            </div>
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1 text-xs text-white/50 shrink-0">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
              </span>
            )}
            {/* History toggle */}
            <button
              onClick={() => setShowHistory(h => !h)}
              title="Change history"
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors shrink-0 ${
                showHistory
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
              }`}>
              <History className="w-3.5 h-3.5" />
              {history.length > 0 && <span className="tabular-nums">{history.length}</span>}
            </button>
          </div>

          {/* iframe + history panel side-by-side */}
          <div className="flex-1 flex gap-2 overflow-hidden">
            {/* iframe */}
            <div className="flex-1 flex items-start justify-center overflow-hidden">
              <div className="h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300"
                style={{ width: iframeWidth, maxWidth: "100%" }}>
                <iframe
                  key={iframeKey}
                  src={iframeSrc}
                  className="w-full h-full"
                  style={{ border: "none", display: "block" }}
                  title="Site preview"
                />
              </div>
            </div>

            {/* Change history panel */}
            {showHistory && (
              <div className="w-64 shrink-0 rounded-2xl border border-white/10 flex flex-col overflow-hidden"
                style={{ background: "rgba(15,15,22,0.98)" }}>
                <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-white/70">Change History</span>
                  <button onClick={() => setShowHistory(false)} className="text-white/30 hover:text-white/70">
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="text-xs text-white/30 text-center py-6">No changes yet</p>
                  ) : (
                    <div className="p-2 space-y-1.5">
                      {history.map((entry, i) => (
                        <div key={entry.id}
                          className="rounded-xl p-2.5 border border-white/8"
                          style={{ background: "rgba(255,255,255,0.03)" }}>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <p className="text-[10px] text-white/40">
                              {entry.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {i === 0 && <span className="ml-1 text-violet-400 font-semibold">· latest</span>}
                            </p>
                            <button
                              onClick={() => {
                                latestRef.current = { ...entry.snapshot };
                                setSavedConfig(entry.snapshot);
                                setDirty({});
                                // force save this reverted state
                                fetch(`/api/projects/${projectId}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ paramValues: entry.snapshot }),
                                }).then(() => {
                                  setIframeSrc(`/site/${projectSlug}?preview=1&_t=${Date.now()}`);
                                  setIframeKey(k => k + 1);
                                  setPublishedClean(false);
                                });
                              }}
                              title="Revert to this version"
                              className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-1.5 py-0.5 rounded-md transition-colors shrink-0">
                              <RotateCcw className="w-2.5 h-2.5" /> Revert
                            </button>
                          </div>
                          <p className="text-[11px] text-white/60 leading-snug">{entry.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

      </div>

      {/* ══ BOTTOM ACTION BAR ════════════════════════════════════════════════ */}
      <div className="shrink-0 border-t border-white/10 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(8,8,14,0.98)" }}>

        {/* Status indicator */}
        <div className="flex-1 min-w-0">
          {hasDirty ? (
            <p className="text-xs text-amber-400 font-medium">● Unsaved draft — click Save, then Publish to go live</p>
          ) : saveStatus === "saving" ? (
            <p className="text-xs text-white/40 font-medium">Saving draft…</p>
          ) : saveStatus === "saved" ? (
            <p className="text-xs text-violet-400 font-medium">✓ Draft saved — click <strong>Publish Live</strong> to update the live site</p>
          ) : live ? (
            <p className="text-xs text-emerald-400 font-medium">● Site is live — edit and publish to update</p>
          ) : (
            <p className="text-xs text-white/30">Edit above, save, then publish to go live</p>
          )}
        </div>

        {/* Save draft */}
        <button onClick={doSave} disabled={saving || !hasDirty}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
          style={{ background: hasDirty ? "#8b5cf6" : "rgba(255,255,255,0.08)", color: "#fff" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Draft"}
        </button>

        {/* Publish Live */}
        <button
          onClick={publishLive}
          disabled={publishing || publishedClean}
          title={publishedClean ? "Already published — make changes to re-enable" : "Publish draft to live site"}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: publishedClean
              ? "rgba(16,185,129,0.15)"
              : publishing
                ? "rgba(16,185,129,0.4)"
                : "linear-gradient(135deg, #10b981, #059669)",
            boxShadow: publishedClean || publishing ? "none" : "0 0 20px rgba(16,185,129,0.25)",
          }}>
          {publishing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
            : publishedClean
              ? <><Check className="w-4 h-4" /> Published</>
              : <><Rocket className="w-4 h-4" /> Publish Live</>
          }
        </button>
      </div>

      {/* ── Domain modal (Pro) ─────────────────────────────────────────────── */}
      {showDomain && (
        <DomainModal
          projectId={projectId}
          projectName={projectName}
          projectSlug={projectSlug}
          onClose={() => setShowDomain(false)}
          onUpgrade={() => { setShowDomain(false); setShowUpgrade(true); }}
        />
      )}

      {/* ── Upgrade modal (Free → Premium) ────────────────────────────────── */}
      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          onUpgraded={() => { setShowUpgrade(false); setShowDomain(true); }}
          projectCount={0}
          freeLimit={3}
        />
      )}
    </div>
  );
}
