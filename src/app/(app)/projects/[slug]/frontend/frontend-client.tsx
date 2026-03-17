"use client";
/**
 * Frontend Editor — Block67 Intelligence AI chat + live iframe preview
 *
 * Left panel:  AI chat + Sections tab with friendly forms
 * Right panel: iframe preview (auto-refreshes on save) + quick-edit strip
 *
 * Fixes:
 *  - useRef never called inside JSX (was causing client-side exception)
 *  - doSave never called inside setState updater (was causing double-save bugs)
 *  - latestRef pattern for stale-closure-free saves
 *  - iframe always visible at /site/[slug] (not blocked on isLive)
 *  - Publish Live button to set status ACTIVE
 *  - Background color field
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Send, Loader2, RefreshCw, ExternalLink,
  Globe, Palette, MessageSquare, Zap, CheckCircle2,
  Monitor, Tablet, Smartphone, Users, MessageCircle,
  HelpCircle, Mail, Share2, Settings, Plus, Trash2,
  Eye, Rocket,
} from "lucide-react";

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

// ── Section Panel component ────────────────────────────────────────────────────
// NOTE: must be defined BEFORE FrontendClient to avoid any hoisting issues

function SectionPanel({ icon, label, description, enabled, onToggle, children }: {
  icon: React.ReactNode; label: string; description: string;
  enabled: boolean; onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-3 px-3 py-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${enabled ? "bg-violet-600" : "bg-white/10"}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-[11px] text-white/40 truncate">{description}</p>
        </div>
        <button onClick={onToggle}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-lg transition-colors ${
            enabled
              ? "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30"
              : "bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30"
          }`}>
          {enabled ? "−" : "+"}
        </button>
      </div>
      {enabled && children && (
        <div className="border-t border-white/10 px-3 pb-3 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Quick-edit fields per template ────────────────────────────────────────────

const QUICK_FIELDS: Record<string, Array<{ key: string; label: string; type: "text" | "textarea" | "color" | "url" }>> = {
  "erc20-token":       [
    { key: "tokenName",   label: "Token Name",   type: "text" },
    { key: "description", label: "Description",  type: "textarea" },
    { key: "website",     label: "Website",       type: "url" },
    { key: "accentColor", label: "Accent Color",  type: "color" },
    { key: "_bgColor",    label: "Background",    type: "color" },
  ],
  "meme-token":        [
    { key: "tokenName",   label: "Token Name",   type: "text" },
    { key: "description", label: "Description",  type: "textarea" },
    { key: "website",     label: "Website",       type: "url" },
    { key: "accentColor", label: "Accent Color",  type: "color" },
    { key: "_bgColor",    label: "Background",    type: "color" },
  ],
  "nft-collection":    [
    { key: "collectionName", label: "Name",          type: "text" },
    { key: "description",    label: "Description",   type: "textarea" },
    { key: "website",        label: "Website",        type: "url" },
    { key: "accentColor",    label: "Accent Color",   type: "color" },
    { key: "_bgColor",       label: "Background",     type: "color" },
  ],
  "dao-governance":    [
    { key: "daoName",     label: "DAO Name",     type: "text" },
    { key: "description", label: "Description",  type: "textarea" },
    { key: "website",     label: "Website",       type: "url" },
    { key: "accentColor", label: "Accent Color",  type: "color" },
    { key: "_bgColor",    label: "Background",    type: "color" },
  ],
  "staking-dashboard": [
    { key: "tokenName",   label: "Platform Name", type: "text" },
    { key: "description", label: "Description",   type: "textarea" },
    { key: "website",     label: "Website",        type: "url" },
    { key: "accentColor", label: "Accent Color",   type: "color" },
    { key: "_bgColor",    label: "Background",     type: "color" },
  ],
};

// ── AI Response Generator ─────────────────────────────────────────────────────

function aiResponse(userMsg: string, activeSections: string[]): { text: string; tab?: "sections" } {
  const msg = userMsg.toLowerCase();
  if (msg.includes("team") || msg.includes("people") || msg.includes("founder"))
    return { text: activeSections.includes("team")
      ? "Team section is already enabled! Go to the **Sections** tab to add/edit team members."
      : "Great! Switch to the **Sections** tab — click **+** next to Team Members to add your founders. You can add names, roles, photos and Twitter handles.", tab: "sections" };
  if (msg.includes("faq") || msg.includes("question"))
    return { text: activeSections.includes("faq")
      ? "FAQ is active. Go to **Sections** tab to edit your questions and answers."
      : "Adding a FAQ section builds trust. Head to the **Sections** tab — enable FAQ and click **Auto-generate 4 FAQs** to get started instantly.", tab: "sections" };
  if (msg.includes("whatsapp") || msg.includes("contact") || msg.includes("phone"))
    return { text: "You can add a WhatsApp button and contact info in the **Sections** tab. People love direct messaging!", tab: "sections" };
  if (msg.includes("social") || msg.includes("twitter") || msg.includes("telegram") || msg.includes("discord"))
    return { text: "Social links section is in the **Sections** tab — add your Twitter, Telegram, Discord and GitHub.", tab: "sections" };
  if (msg.includes("color") || msg.includes("theme") || msg.includes("brand"))
    return { text: "Use the **Accent Color** and **Background** pickers in the quick-edit strip above. The entire site updates — buttons, glow, gradients, and background all change instantly." };
  if (msg.includes("background") || msg.includes("bg") || msg.includes("dark"))
    return { text: "Use the **Background** color picker in the strip above to change the site background. Default is dark (#0a0a0f). Try a very dark navy like #050510 for a richer feel." };
  if (msg.includes("description") || msg.includes("about") || msg.includes("text"))
    return { text: "Update your **Description** in the quick-edit fields above. Clear, compelling copy tells your story — keep it under 150 words for best results." };
  if (msg.includes("publish") || msg.includes("live") || msg.includes("go live"))
    return { text: "Once you're happy with the design, click **Publish Live** in the top bar. Your site goes live at your block67.app subdomain instantly." };
  if (msg.includes("section") || msg.includes("add"))
    return { text: "Go to the **Sections** tab on the left to add team, FAQ, contact, social links, and WhatsApp sections.", tab: "sections" };
  return { text: `I'm Block67 Intelligence — your frontend design assistant.\n\nI can help with:\n• **Sections** — team, FAQ, contact, social links, WhatsApp\n• **Design** — accent color, background color, description\n• **Publishing** — make it live\n\nWhat would you like to change?` };
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function FrontendClient({
  projectId, projectSlug, projectName, templateKey, config: initialConfig, isLive,
}: {
  projectId: string; projectSlug: string; projectName: string;
  templateKey: string; config: Record<string, string>; isLive: boolean;
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [savedConfig, setSavedConfig] = useState<Record<string, string>>(initialConfig);
  const [dirty,       setDirty]       = useState<Record<string, string>>({});
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [live,        setLive]        = useState(isLive);
  const [msgs,        setMsgs]        = useState<ChatMessage[]>([{
    id: "welcome", role: "assistant", ts: new Date(),
    text: `Hi! I'm Block67 Intelligence — your frontend design assistant for **${projectName}**.\n\nUse the quick-edit strip above to change names, colors, and description. Switch to the **Sections** tab to add team, FAQ, contact info, and social links.\n\nWhat would you like to build?`,
  }]);
  const [input,       setInput]       = useState("");
  const [thinking,    setThinking]    = useState(false);
  const [viewMode,    setViewMode]    = useState<ViewMode>("desktop");
  const [iframeKey,   setIframeKey]   = useState(0);
  const [leftTab,     setLeftTab]     = useState<"chat" | "sections">("chat");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    try { return JSON.parse(initialConfig._team_json || "[]"); } catch { return []; }
  });
  const [faqItems,    setFaqItems]    = useState<FaqItem[]>(() => {
    try { return JSON.parse(initialConfig._faq_json || "[]"); } catch { return []; }
  });
  const [genFaq,      setGenFaq]      = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const chatEndRef   = useRef<HTMLDivElement>(null);
  const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  // latestRef always holds the most current merged config (savedConfig + dirty)
  // This avoids stale-closure bugs when calling doSave from callbacks
  const latestRef    = useRef<Record<string, string>>(initialConfig);

  // Keep latestRef in sync whenever savedConfig or dirty changes
  const merged = { ...savedConfig, ...dirty };
  useEffect(() => { latestRef.current = { ...savedConfig, ...dirty }; }, [savedConfig, dirty]);

  const activeSections = (merged._sections || "").split(",").map(s => s.trim()).filter(Boolean);
  const quickFields    = QUICK_FIELDS[templateKey] ?? QUICK_FIELDS["erc20-token"];
  // Always use local preview URL — works even before publish
  const previewUrl = `/site/${projectSlug}`;
  const liveUrl    = `https://${projectSlug}.block67.app`;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // ── Save to DB ──────────────────────────────────────────────────────────────
  const doSave = useCallback(async () => {
    const updates = latestRef.current;
    if (Object.keys(updates).length === 0) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ paramValues: updates }),
      });
      if (res.ok) {
        setSavedConfig(updates);
        setDirty({});
        setSaved(true);
        setIframeKey(k => k + 1);  // force iframe reload to show new values
        setTimeout(() => setSaved(false), 3000);
      }
    } finally { setSaving(false); }
  }, [projectId]);

  // Debounced auto-save — waits 1.5s after last keystroke
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 1500);
  }, [doSave]);

  // Update a single field — keeps latestRef in sync immediately
  const setField = useCallback((key: string, val: string) => {
    latestRef.current = { ...latestRef.current, [key]: val };
    setDirty(prev => ({ ...prev, [key]: val }));
    scheduleSave();
  }, [scheduleSave]);

  // Toggle section on/off — saves immediately (no debounce needed)
  const toggleSection = useCallback((key: string) => {
    const curr = new Set((latestRef.current._sections || "").split(",").map(s => s.trim()).filter(Boolean));
    if (curr.has(key)) curr.delete(key); else curr.add(key);
    const val = Array.from(curr).join(",");
    latestRef.current = { ...latestRef.current, _sections: val };
    setDirty(prev => ({ ...prev, _sections: val }));
    // Save immediately after toggle (not debounced)
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 100);
  }, [doSave]);

  // Save team JSON immediately
  const saveTeam = useCallback((members: TeamMember[]) => {
    const json = JSON.stringify(members);
    latestRef.current = { ...latestRef.current, _team_json: json };
    setDirty(prev => ({ ...prev, _team_json: json }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 600);
  }, [doSave]);

  // Save FAQ JSON immediately
  const saveFaq = useCallback((items: FaqItem[]) => {
    const json = JSON.stringify(items);
    latestRef.current = { ...latestRef.current, _faq_json: json };
    setDirty(prev => ({ ...prev, _faq_json: json }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 600);
  }, [doSave]);

  // Generate 4 sample FAQs
  const generateFaq = useCallback(() => {
    setGenFaq(true);
    const name = latestRef.current.tokenName || latestRef.current.collectionName || latestRef.current.daoName || projectName;
    const samples: FaqItem[] = [
      { q: `What is ${name}?`,          a: `${name} is a decentralized project built on blockchain technology, giving users full ownership and transparency.` },
      { q: "How do I get started?",     a: "Connect your MetaMask wallet using the Connect Wallet button, then interact with the smart contract directly from this page." },
      { q: "Is this project audited?",  a: "Our smart contracts are built on OpenZeppelin v5 standards — the gold standard for secure Solidity development." },
      { q: "Where can I get support?",  a: "Reach out through our social channels or contact email. Our community is always here to help." },
    ];
    setTimeout(() => {
      setFaqItems(samples);
      saveFaq(samples);
      setGenFaq(false);
    }, 800);
  }, [projectName, saveFaq]);

  // Publish site live
  const publishLive = useCallback(async () => {
    setPublishing(true);
    try {
      // First flush any pending changes
      await doSave();
      const res = await fetch(`/api/projects/${projectId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: "ACTIVE" }),
      });
      if (res.ok) { setLive(true); }
    } finally { setPublishing(false); }
  }, [doSave, projectId]);

  // Send chat message
  const sendMsg = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text, ts: new Date() };
    setMsgs(p => [...p, userMsg]);
    setThinking(true);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    const { text: aiText, tab } = aiResponse(text, activeSections);
    if (tab) setLeftTab(tab);
    const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role: "assistant", text: aiText, ts: new Date() };
    setMsgs(p => [...p, aiMsg]);
    setThinking(false);
  }, [input, thinking, activeSections]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  const iframeWidth = viewMode === "desktop" ? "100%" : viewMode === "tablet" ? "768px" : "390px";
  const hasDirty    = Object.keys(dirty).length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Top bar ── */}
      <header className="h-12 border-b border-white/10 flex items-center gap-3 px-4 shrink-0 z-10"
        style={{ background: "rgba(10,10,15,0.97)" }}>
        <Link href={`/projects/${projectSlug}`}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Palette className="w-4 h-4 text-violet-400 shrink-0" />
        <span className="font-semibold text-sm text-white truncate">{projectName}</span>
        <span className="text-white/30 text-xs hidden sm:block">— Frontend Editor</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Device picker */}
          <div className="flex items-center gap-0.5 border border-white/15 rounded-lg p-0.5">
            {(["desktop","tablet","mobile"] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-2 py-1 rounded text-xs transition-colors ${viewMode === m ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"}`}>
                {m === "desktop" ? <Monitor className="w-3.5 h-3.5" /> : m === "tablet" ? <Tablet className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          {/* Live site link */}
          {live && (
            <a href={liveUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-colors">
              <Eye className="w-3.5 h-3.5" /> Live <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* Save & Preview */}
          <button onClick={doSave} disabled={saving || !hasDirty}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 text-white"
            style={{ background: hasDirty ? "#8b5cf6" : "rgba(255,255,255,0.1)" }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Zap className="w-3.5 h-3.5" />}
            {saved ? "Saved!" : saving ? "Saving…" : "Save & Preview"}
          </button>

          {/* Publish Live */}
          {!live && (
            <button onClick={publishLive} disabled={publishing}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all text-white"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
              {publishing ? "Publishing…" : "Publish Live"}
            </button>
          )}
        </div>
      </header>

      {/* ── Quick-edit strip ── */}
      <div className="border-b border-white/10 px-4 py-2.5 flex items-end gap-4 overflow-x-auto shrink-0"
        style={{ background: "rgba(15,15,22,0.98)" }}>
        {quickFields.map(f => (
          <div key={f.key} className="shrink-0">
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">{f.label}</label>
            {f.type === "color" ? (
              <div className="flex items-center gap-2">
                <input type="color"
                  value={merged[f.key] || (f.key === "_bgColor" ? "#0a0a0f" : "#6366f1")}
                  onChange={e => setField(f.key, e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 bg-transparent" />
                <span className="text-xs text-white/40 font-mono">
                  {merged[f.key] || (f.key === "_bgColor" ? "#0a0a0f" : "#6366f1")}
                </span>
              </div>
            ) : f.type === "textarea" ? (
              <textarea value={merged[f.key] || ""} onChange={e => setField(f.key, e.target.value)}
                placeholder={`${f.label}…`} rows={2}
                className="w-52 text-xs rounded-lg px-2.5 py-2 outline-none resize-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
            ) : (
              <input type={f.type === "url" ? "url" : "text"} value={merged[f.key] || ""}
                onChange={e => setField(f.key, e.target.value)} placeholder={`${f.label}…`}
                className="w-44 text-xs rounded-lg px-2.5 py-2 outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
            )}
          </div>
        ))}
        <button onClick={() => setIframeKey(k => k + 1)}
          className="ml-auto shrink-0 flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 border border-white/15 px-2.5 py-1.5 rounded-lg transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel ── */}
        <aside className="w-[360px] shrink-0 border-r border-white/10 flex flex-col overflow-hidden"
          style={{ background: "rgba(12,12,18,0.99)" }}>

          {/* Tabs */}
          <div className="flex border-b border-white/10 shrink-0">
            {(["chat", "sections"] as const).map(tab => (
              <button key={tab} onClick={() => setLeftTab(tab)}
                className={`flex-1 py-3 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  leftTab === tab ? "text-violet-400 border-b-2 border-violet-500" : "text-white/40 hover:text-white/60"
                }`}>
                {tab === "chat"
                  ? <><MessageSquare className="w-3.5 h-3.5" /> Intelligence</>
                  : <><Settings className="w-3.5 h-3.5" /> Sections</>}
              </button>
            ))}
          </div>

          {/* ── Chat tab ── */}
          {leftTab === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {msgs.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[88%]">
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                            <Zap className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-[11px] text-white/40">Block67 Intelligence</span>
                        </div>
                      )}
                      <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user" ? "bg-violet-600 text-white" : "text-white/85 border border-white/10"
                      }`} style={msg.role === "assistant" ? { background: "rgba(255,255,255,0.05)" } : {}}>
                        {msg.text.split("**").map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}
                      </div>
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-white/10 shrink-0">
                <div className="flex gap-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me to add a team section, change colors, add WhatsApp…"
                    rows={2}
                    className="flex-1 text-xs rounded-xl px-3 py-2.5 outline-none resize-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50"
                  />
                  <button onClick={sendMsg} disabled={!input.trim() || thinking}
                    className="w-9 h-9 mt-auto bg-violet-600 hover:bg-violet-500 disabled:opacity-30 rounded-xl flex items-center justify-center transition-colors">
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Sections tab ── */}
          {leftTab === "sections" && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">

                {/* Team */}
                <SectionPanel
                  icon={<Users className="w-4 h-4" />}
                  label="Team Members"
                  description="Introduce your founders and team"
                  enabled={activeSections.includes("team")}
                  onToggle={() => toggleSection("team")}
                >
                  <div className="space-y-3">
                    {teamMembers.map((m, i) => (
                      <div key={i} className="rounded-xl p-3 space-y-2"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white/40 font-semibold uppercase tracking-wider">Member {i+1}</span>
                          <button onClick={() => { const n = teamMembers.filter((_,j) => j !== i); setTeamMembers(n); saveTeam(n); }}
                            className="text-white/30 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input value={m.name}
                          onChange={e => { const n = [...teamMembers]; n[i] = {...n[i], name: e.target.value}; setTeamMembers(n); saveTeam(n); }}
                          placeholder="Full name"
                          className="w-full text-xs px-2.5 py-2 rounded-lg outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
                        <input value={m.role}
                          onChange={e => { const n = [...teamMembers]; n[i] = {...n[i], role: e.target.value}; setTeamMembers(n); saveTeam(n); }}
                          placeholder="Role / Designation"
                          className="w-full text-xs px-2.5 py-2 rounded-lg outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
                        <input value={m.twitter || ""}
                          onChange={e => { const n = [...teamMembers]; n[i] = {...n[i], twitter: e.target.value}; setTeamMembers(n); saveTeam(n); }}
                          placeholder="@twitter (optional)"
                          className="w-full text-xs px-2.5 py-2 rounded-lg outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
                        <input value={m.photo || ""}
                          onChange={e => { const n = [...teamMembers]; n[i] = {...n[i], photo: e.target.value}; setTeamMembers(n); saveTeam(n); }}
                          placeholder="Photo URL (optional)"
                          className="w-full text-xs px-2.5 py-2 rounded-lg outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
                      </div>
                    ))}
                    <button
                      onClick={() => { const n = [...teamMembers, { name: "", role: "" }]; setTeamMembers(n); saveTeam(n); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add Team Member
                    </button>
                  </div>
                </SectionPanel>

                {/* FAQ */}
                <SectionPanel
                  icon={<HelpCircle className="w-4 h-4" />}
                  label="FAQ"
                  description="Common questions about your project"
                  enabled={activeSections.includes("faq")}
                  onToggle={() => toggleSection("faq")}
                >
                  <div className="space-y-3">
                    {faqItems.length === 0 && (
                      <button onClick={generateFaq} disabled={genFaq}
                        className="w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold rounded-xl text-white transition-colors disabled:opacity-50"
                        style={{ background: "rgba(139,92,246,0.3)", border: "1px solid rgba(139,92,246,0.4)" }}>
                        {genFaq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        {genFaq ? "Generating…" : "Auto-generate 4 FAQs"}
                      </button>
                    )}
                    {faqItems.map((item, i) => (
                      <div key={i} className="rounded-xl p-3 space-y-2"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white/40 font-semibold uppercase tracking-wider">FAQ {i+1}</span>
                          <button onClick={() => { const n = faqItems.filter((_,j) => j !== i); setFaqItems(n); saveFaq(n); }}
                            className="text-white/30 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input value={item.q}
                          onChange={e => { const n = [...faqItems]; n[i] = {...n[i], q: e.target.value}; setFaqItems(n); saveFaq(n); }}
                          placeholder="Question"
                          className="w-full text-xs px-2.5 py-2 rounded-lg outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
                        <textarea value={item.a}
                          onChange={e => { const n = [...faqItems]; n[i] = {...n[i], a: e.target.value}; setFaqItems(n); saveFaq(n); }}
                          placeholder="Answer" rows={2}
                          className="w-full text-xs px-2.5 py-2 rounded-lg outline-none resize-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
                      </div>
                    ))}
                    <button
                      onClick={() => { const n = [...faqItems, { q: "", a: "" }]; setFaqItems(n); saveFaq(n); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add FAQ
                    </button>
                  </div>
                </SectionPanel>

                {/* Contact */}
                <SectionPanel
                  icon={<Mail className="w-4 h-4" />}
                  label="Contact"
                  description="Email, phone, address info"
                  enabled={activeSections.includes("contact")}
                  onToggle={() => toggleSection("contact")}
                >
                  <div className="space-y-2">
                    {[
                      { key: "_contact_email",    label: "Email",    placeholder: "hello@yourproject.com" },
                      { key: "_contact_phone",    label: "Phone",    placeholder: "+1 (555) 000-0000" },
                      { key: "_contact_location", label: "City",     placeholder: "New York, USA" },
                      { key: "_contact_address",  label: "Address",  placeholder: "123 Main St, City" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">{f.label}</label>
                        <input value={merged[f.key] || ""} onChange={e => setField(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full text-xs px-2.5 py-2 rounded-lg outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
                      </div>
                    ))}
                  </div>
                </SectionPanel>

                {/* Social */}
                <SectionPanel
                  icon={<Share2 className="w-4 h-4" />}
                  label="Social Links"
                  description="Twitter, Telegram, Discord, GitHub"
                  enabled={activeSections.includes("social")}
                  onToggle={() => toggleSection("social")}
                >
                  <div className="space-y-2">
                    {[
                      { key: "_social_twitter",  label: "Twitter / X",   placeholder: "@yourhandle" },
                      { key: "_social_telegram", label: "Telegram",       placeholder: "@groupname or t.me/…" },
                      { key: "_social_discord",  label: "Discord",        placeholder: "discord.gg/invite" },
                      { key: "_social_github",   label: "GitHub",         placeholder: "yourusername" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">{f.label}</label>
                        <input value={merged[f.key] || ""} onChange={e => setField(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full text-xs px-2.5 py-2 rounded-lg outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
                      </div>
                    ))}
                  </div>
                </SectionPanel>

                {/* WhatsApp */}
                <SectionPanel
                  icon={<MessageCircle className="w-4 h-4" />}
                  label="WhatsApp Button"
                  description="Floating contact button on your site"
                  enabled={activeSections.includes("whatsapp")}
                  onToggle={() => toggleSection("whatsapp")}
                >
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">WhatsApp Number</label>
                    <input value={merged._whatsapp || ""} onChange={e => setField("_whatsapp", e.target.value)}
                      placeholder="+1234567890 (with country code)"
                      className="w-full text-xs px-2.5 py-2 rounded-lg outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50" />
                  </div>
                </SectionPanel>

              </div>
            </div>
          )}
        </aside>

        {/* ── Right: iframe preview ── */}
        <main className="flex-1 overflow-hidden flex flex-col items-center justify-start p-3"
          style={{ background: "#0d0d14" }}>
          {/* Status bar */}
          <div className="w-full flex items-center gap-3 mb-3 px-1">
            <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <Globe className="w-3 h-3 text-white/30" />
              <span className="text-xs text-white/40 font-mono truncate">{previewUrl}</span>
            </div>
            {saved && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Changes saved
              </span>
            )}
          </div>

          {/* iframe */}
          <div className="flex-1 w-full flex items-start justify-center overflow-hidden">
            <div className="relative h-full transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden border border-white/10"
              style={{ width: iframeWidth, maxWidth: "100%" }}>
              <iframe
                key={iframeKey}
                src={`${previewUrl}?_v=${iframeKey}`}
                className="w-full h-full"
                style={{ border: "none", display: "block" }}
                title="Site preview"
              />
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
