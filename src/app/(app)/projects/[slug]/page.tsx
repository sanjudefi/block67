"use client";
// Builder — Base44 style with big tab strip, flash feedback, fresh UI
// Route: /projects/:slug
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, Zap, Globe, Rocket, Save, Check, X,
  Monitor, Tablet, Smartphone, Settings2, ChevronDown,
  Send, Mic, RefreshCw, Eye, Sliders, CircuitBoard,
  CheckCircle2, Loader2,
} from "lucide-react";
import { TemplatePreview } from "@/lib/templates/previews";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import type { TemplateId } from "@/lib/templates/index";

type ViewMode = "desktop" | "tablet" | "mobile";
type TabMode  = "preview" | "config" | "deploy";

interface PlanSection { heading: string; items: string[] }
interface ChatMessage {
  id: string; role: "user" | "assistant";
  text: string; plan?: PlanSection[]; ts: Date;
}
interface Project {
  id: string; name: string; slug: string; status: string;
  paramValues: Record<string, string>;
}

const DID_YOU_KNOW = [
  "Deploy to Ethereum, Base, Polygon and 12 other EVM chains",
  "Your contract ABI is saved automatically after deployment",
  "You can publish your app at yourproject.block67.app for free",
  "Contracts are deployed directly from your wallet — no custody",
];

function parsePlan(text: string): { plan: PlanSection[]; remainder: string } {
  const sections: PlanSection[] = [];
  const lines = text.split("\n");
  let cur: PlanSection | null = null;
  const rem: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const hm = t.match(/^\*\*(.+?):?\*\*:?$/);
    if (hm) { if (cur) sections.push(cur); cur = { heading: hm[1], items: [] }; }
    else if (t.startsWith("• ") || t.startsWith("- ")) {
      if (!cur) cur = { heading: "", items: [] };
      cur.items.push(t.slice(2));
    } else { if (cur) { sections.push(cur); cur = null; } rem.push(t); }
  }
  if (cur) sections.push(cur);
  return { plan: sections, remainder: rem.join(" ") };
}

const CHAINS = [
  { name: "Ethereum Mainnet", id: 1,        color: "#627EEA", sym: "ETH" },
  { name: "Base",             id: 8453,     color: "#0052FF", sym: "ETH" },
  { name: "Polygon",          id: 137,      color: "#8247E5", sym: "MATIC" },
  { name: "BNB Smart Chain",  id: 56,       color: "#F0B90B", sym: "BNB" },
  { name: "Sepolia Testnet",  id: 11155111, color: "#9B9B9B", sym: "ETH" },
];

export default function BuilderPage({ params }: { params: { slug: string } }) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [project, setProject]       = useState<Project | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [config, setConfig]         = useState<Record<string, string>>({});
  const [templateId, setTemplateId] = useState<TemplateId>("erc20-token");

  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [input, setInput]           = useState("");
  const [generating, setGenerating] = useState(false);
  const [buildingRight, setBuildingRight] = useState(false);

  const [tab, setTab]               = useState<TabMode>("preview");
  const [viewMode, setViewMode]     = useState<ViewMode>("desktop");

  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [projectName, setProjectName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [publishModal, setPublishModal] = useState(false);

  // Flash feedback state for preview connection
  const [previewFlash, setPreviewFlash]   = useState(false);
  const [updateToast, setUpdateToast]     = useState<string | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [selectedChain, setSelectedChain] = useState(0);
  const [deployStep, setDeployStep]       = useState<"idle"|"connecting"|"deploying"|"done">("idle");

  const [didYouKnow] = useState(() => DID_YOU_KNOW[Math.floor(Math.random() * DID_YOU_KNOW.length)]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const nameRef    = useRef<HTMLInputElement>(null);

  // Load project
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        const found = (d.projects ?? []).find((p: Project) => p.slug === params.slug);
        if (!found) { setNotFound(true); setLoading(false); return; }
        setProject(found);
        setProjectName(found.name);
        const pv = found.paramValues as Record<string, string>;
        setConfig(pv);
        if (pv._templateKey) setTemplateId(pv._templateKey as TemplateId);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [params.slug]);

  // Auto-fire initial prompt
  useEffect(() => {
    if (!project || loading) return;
    const p = searchParams.get("prompt");
    if (p && messages.length === 0) sendMessage(p, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, loading]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, generating]);

  const template = BUILTIN_TEMPLATES.find((t) => t.id === templateId);

  function flashPreview(msg: string) {
    setPreviewFlash(true);
    setUpdateToast(msg);
    setTimeout(() => setPreviewFlash(false), 600);
    setTimeout(() => setUpdateToast(null), 2500);
  }

  const saveProject = useCallback(async (newConfig?: Record<string, string>, newName?: string) => {
    if (!project) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paramValues: newConfig ?? config, ...(newName ? { name: newName } : {}) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }, [project, config]);

  async function sendMessage(text?: string, isInitial = false) {
    const msg = (text ?? input).trim();
    if (!msg || generating) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: msg, ts: new Date() }]);
    if (!text) setInput("");
    setGenerating(true);
    if (isInitial) setBuildingRight(true);

    try {
      const res  = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: msg, templateId, config }),
      });
      const data = await res.json();

      const hasConfigChanges = data.config && Object.keys(data.config).length > 0;
      let newConfig = config;

      if (hasConfigChanges) {
        newConfig = { ...config, ...data.config };
        setConfig(newConfig);
        // Switch to preview tab so user sees the update
        setTab("preview");
        // Flash the preview panel to show the connection
        setTimeout(() => flashPreview(data.message ?? "Preview updated"), 100);
        if (project) {
          await fetch(`/api/projects/${project.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paramValues: newConfig }),
          });
        }
      }

      const rawText = data.message ?? "Done! Preview updated.";
      const { plan, remainder } = isInitial
        ? parsePlan(`I'll build your **${template?.name ?? "blockchain app"}**. Here's my plan:\n\n**Smart Contract:**\n• ${template?.name ?? "Contract"} template selected\n${Object.entries(data.config ?? {}).slice(0, 3).map(([k, v]) => `• ${k}: ${v}`).join("\n")}\n\n**Frontend:**\n• Live preview ready below\n• All configuration applied\n\n**What's next:**\n• Refine with more prompts\n• Edit config directly\n• Deploy contract to blockchain\n\n${rawText}`)
        : { plan: [], remainder: rawText };

      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: remainder, plan, ts: new Date() }]);
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: "Something went wrong. Please try again.", ts: new Date() }]);
    } finally {
      setGenerating(false);
      setBuildingRight(false);
      inputRef.current?.focus();
    }
  }

  async function publishProject() {
    if (!project) return;
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    setProject((p) => p ? { ...p, status: "ACTIVE" } : p);
    setPublishModal(false);
  }

  const VIEW_W: Record<ViewMode, string> = { desktop: "100%", tablet: "768px", mobile: "390px" };

  if (loading) return (
    <div className="h-screen bg-white flex items-center justify-center">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    </div>
  );

  if (notFound) return (
    <div className="h-screen bg-white flex flex-col items-center justify-center gap-3">
      <p className="text-gray-800 font-semibold">Project not found</p>
      <button onClick={() => router.push("/dashboard")} className="text-indigo-600 text-sm hover:underline">← Back to home</button>
    </div>
  );

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">

      {/* ── Thin top bar ──────────────────────────────────────────────── */}
      <header className="h-11 border-b border-gray-100 flex items-center px-4 gap-3 flex-shrink-0 bg-white z-30">
        {/* Back */}
        <button
          onClick={() => router.push("/dashboard")}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          {editingName ? (
            <input
              ref={nameRef}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={async () => {
                setEditingName(false);
                if (projectName.trim() && projectName !== project?.name) {
                  await saveProject(undefined, projectName.trim());
                  setProject((p) => p ? { ...p, name: projectName.trim() } : p);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") nameRef.current?.blur();
                if (e.key === "Escape") { setProjectName(project?.name ?? ""); setEditingName(false); }
              }}
              className="text-sm font-semibold text-gray-900 bg-gray-100 border border-indigo-400 rounded-md px-2 py-0.5 outline-none max-w-[160px]"
              autoFocus
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="text-sm font-semibold text-gray-900 hover:text-gray-600 max-w-[160px] truncate">
              {projectName}
            </button>
          )}
          <span className="text-gray-200 text-sm">·</span>
          <span className="text-xs text-gray-400 hidden sm:block">Personal Workspace</span>
        </div>

        <div className="flex-1" />

        {/* Save */}
        <button
          onClick={() => saveProject()}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {saved ? <><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600">Saved</span></>
           : saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</>
           : <><Save className="w-3.5 h-3.5" />Save</>}
        </button>

        {/* Published badge / Publish */}
        {project?.status === "ACTIVE" ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        ) : (
          <button
            onClick={() => setPublishModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-indigo-600 text-white transition-colors"
          >
            <Globe className="w-3.5 h-3.5" /> Publish
          </button>
        )}
      </header>

      {/* ── Big tab strip ─────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-white flex-shrink-0 px-4 z-20">
        <div className="flex gap-1">
          {([
            { id: "preview", icon: Eye,         label: "Preview",          sub: "See your app live" },
            { id: "config",  icon: Sliders,      label: "Configure",        sub: "Edit parameters" },
            { id: "deploy",  icon: CircuitBoard, label: "Deploy Contract",  sub: "Launch on-chain" },
          ] as { id: TabMode; icon: React.FC<{className?:string}>; label: string; sub: string }[]).map(({ id, icon: Icon, label, sub }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2.5 px-4 py-3 border-b-2 transition-all group ${
                tab === id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className={`w-4 h-4 ${tab === id ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"}`} />
              <div className="text-left hidden sm:block">
                <div className={`text-sm font-semibold leading-tight ${tab === id ? "text-indigo-700" : "text-gray-700"}`}>{label}</div>
                <div className="text-[10px] text-gray-400 leading-tight">{sub}</div>
              </div>
              <span className="sm:hidden text-sm font-semibold">{label}</span>
            </button>
          ))}

          {/* View mode (preview tab only) */}
          {tab === "preview" && (
            <>
              <div className="flex-1" />
              <div className="flex items-center gap-0.5 self-center bg-gray-100 rounded-lg p-0.5 mr-1">
                {(["desktop", "tablet", "mobile"] as ViewMode[]).map((m) => {
                  const icons = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };
                  const Ic = icons[m];
                  return (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
                      title={m}
                    >
                      <Ic className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Body split ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: AI chat ─────────────────────────────────────────── */}
        <div className="w-[340px] xl:w-[380px] flex-shrink-0 border-r border-gray-100 bg-white flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* Empty / welcome */}
            {messages.length === 0 && !generating && (
              <div className="pt-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-gray-900 text-sm">block67 AI</span>
                  <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium">
                    ● Ready
                  </span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">
                  I&apos;m your AI builder. Describe what you want to customize — colors, content, features — and I&apos;ll update your {template?.name ?? "app"} live.
                </p>
                <div className="space-y-2">
                  {(template?.suggestedPrompts ?? []).slice(0, 4).map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="w-full text-left text-xs text-gray-600 hover:text-indigo-700 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl px-3.5 py-2.5 transition-all leading-relaxed"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, idx) => (
              <div key={msg.id}>
                {msg.role === "assistant" ? (
                  <div>
                    {(idx === 0 || messages[idx - 1]?.role === "user") && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                          <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-xs font-bold text-gray-900">block67 AI</span>
                      </div>
                    )}
                    {/* Structured plan */}
                    {msg.plan && msg.plan.length > 0 && (
                      <div className="text-sm text-gray-700 space-y-3 mb-2">
                        {msg.plan.map((sec, i) => (
                          <div key={i}>
                            {sec.heading && <p className="font-bold text-gray-900 text-[13px] mb-1">{sec.heading}:</p>}
                            {sec.items.map((item, j) => (
                              <div key={j} className="flex items-start gap-2 mb-0.5">
                                <span className="text-gray-300 mt-0.5 text-xs">•</span>
                                <span className="text-gray-600 text-[12px] leading-relaxed">{item}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.text && <p className="text-[12px] text-gray-600 leading-relaxed">{msg.text}</p>}
                    <p className="text-[10px] text-gray-300 mt-1.5">{msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="max-w-[88%] bg-gray-100 rounded-2xl rounded-tr-sm px-3.5 py-2.5">
                      <p className="text-[13px] text-gray-800">{msg.text}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {generating && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-white animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-gray-900">block67 AI</span>
                  <span className="text-[10px] text-indigo-500 animate-pulse">Thinking…</span>
                </div>
                <div className="flex items-center gap-1">
                  {[0, 120, 240].map((d) => (
                    <span key={d} className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Config accordion */}
          <div className="border-t border-gray-100 px-4 py-2">
            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-gray-700 py-1.5 transition-colors"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Settings2 className="w-3 h-3" /> Edit config directly
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showConfigPanel ? "rotate-180" : ""}`} />
            </button>
            {showConfigPanel && template && (
              <div className="space-y-2 pb-2 max-h-52 overflow-y-auto">
                {template.params.map((param) => (
                  <div key={param.key}>
                    <label className="block text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">{param.label}</label>
                    {param.type === "boolean" ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={config[param.key] === "true"}
                          onChange={(e) => { const nc = { ...config, [param.key]: e.target.checked ? "true" : "false" }; setConfig(nc); flashPreview("Config updated"); }}
                          className="rounded" />
                        <span className="text-xs text-gray-500">{config[param.key] === "true" ? "Enabled" : "Disabled"}</span>
                      </label>
                    ) : param.type === "color" ? (
                      <div className="flex items-center gap-2">
                        <input type="color" value={config[param.key] || "#6366f1"}
                          onChange={(e) => { const nc = { ...config, [param.key]: e.target.value }; setConfig(nc); flashPreview("Color updated"); }}
                          className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent" />
                        <span className="text-[11px] text-gray-400 font-mono">{config[param.key]}</span>
                      </div>
                    ) : (
                      <input type="text" value={config[param.key] ?? ""} placeholder={param.placeholder}
                        onChange={(e) => { const nc = { ...config, [param.key]: e.target.value }; setConfig(nc); }}
                        onBlur={() => flashPreview("Preview updated")}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 placeholder-gray-300" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-gray-400 focus-within:bg-white transition-colors px-3 py-2.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={1}
                placeholder="What would you like to change?"
                disabled={generating}
                className="flex-1 bg-transparent text-[13px] text-gray-800 outline-none resize-none placeholder-gray-400 disabled:opacity-40 max-h-20"
                style={{ lineHeight: "1.5" }}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <Mic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || generating}
                  className="w-7 h-7 flex items-center justify-center bg-gray-900 hover:bg-indigo-600 disabled:bg-gray-200 text-white rounded-lg transition-colors"
                >
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <button
                onClick={() => { setConfig(template?.defaultConfig ?? {}); flashPreview("Reset to defaults"); }}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Reset
              </button>
              <span className="text-[10px] text-gray-300">↵ Enter to send</span>
            </div>
          </div>
        </div>

        {/* ── Right panel ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-gray-50">

          {/* Update toast */}
          {updateToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {updateToast}
            </div>
          )}

          {/* ── Preview tab ────────────────────────────────────────── */}
          {tab === "preview" && (
            buildingRight ? (
              <div className="flex-1 flex flex-col items-center justify-center px-4">
                <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-6 ring-1 ring-gray-200">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center animate-pulse">
                    <Zap className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Building your idea…</h2>
                <p className="text-sm text-gray-400 mb-5">Configuring your blockchain app</p>
                <div className="w-56 h-1 bg-gray-200 rounded-full overflow-hidden mb-8">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ animation: "progress 1.8s ease-in-out infinite" }} />
                </div>
                <p className="text-xs text-gray-400 mb-1">Did you know?</p>
                <p className="text-sm text-gray-500 flex items-center gap-1.5 text-center max-w-xs">
                  <span className="text-indigo-400">⟳</span> {didYouKnow}
                </p>
                <style>{`@keyframes progress{0%{width:0;margin-left:0}50%{width:100%;margin-left:0}100%{width:0;margin-left:100%}}`}</style>
              </div>
            ) : (
              <div className="flex-1 overflow-auto flex items-start justify-center p-6">
                <div
                  className={`bg-white rounded-xl overflow-hidden shadow-lg ring-1 transition-all duration-300 ${
                    previewFlash ? "ring-indigo-400 shadow-indigo-200" : "ring-gray-200"
                  }`}
                  style={{
                    width: VIEW_W[viewMode],
                    minHeight: "560px",
                    maxWidth: "100%",
                    minWidth: viewMode === "desktop" ? "820px" : undefined,
                    height: viewMode === "mobile" ? "780px" : undefined,
                    transition: "box-shadow 0.3s, ring 0.3s",
                  }}
                >
                  <TemplatePreview templateId={templateId} config={config} />
                </div>
              </div>
            )
          )}

          {/* ── Config tab ─────────────────────────────────────────── */}
          {tab === "config" && template && (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-lg">
                {/* Template badge */}
                <div className={`flex items-center gap-3 bg-gradient-to-r ${template.gradient} rounded-xl p-4 mb-6 text-white`}>
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <p className="font-bold">{template.name}</p>
                    <p className="text-white/70 text-xs">{template.tagline}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {template.params.map((param) => (
                    <div key={param.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {param.label}
                        {param.required && <span className="text-red-400 ml-1 font-normal text-xs">required</span>}
                      </label>
                      {param.type === "color" ? (
                        <div className="flex items-center gap-3">
                          <input type="color" value={config[param.key] || "#6366f1"}
                            onChange={(e) => { setConfig({ ...config, [param.key]: e.target.value }); flashPreview("Color updated"); }}
                            className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent" />
                          <span className="text-sm text-gray-500 font-mono">{config[param.key]}</span>
                        </div>
                      ) : param.type === "boolean" ? (
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input type="checkbox" checked={config[param.key] === "true"}
                            onChange={(e) => { setConfig({ ...config, [param.key]: e.target.checked ? "true" : "false" }); flashPreview("Updated"); }}
                            className="w-4 h-4 rounded" />
                          <span className="text-sm text-gray-600">{config[param.key] === "true" ? "Enabled" : "Disabled"}</span>
                        </label>
                      ) : (
                        <input type="text" value={config[param.key] ?? ""} placeholder={param.placeholder}
                          onChange={(e) => setConfig({ ...config, [param.key]: e.target.value })}
                          onBlur={() => flashPreview("Preview updated")}
                          className="w-full bg-white border border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 text-gray-900 text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all placeholder-gray-300" />
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => { saveProject(); setTab("preview"); }}
                  className="w-full mt-6 bg-gray-900 hover:bg-indigo-600 text-white text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" /> Save & Preview
                </button>
              </div>
            </div>
          )}

          {/* ── Deploy tab ─────────────────────────────────────────── */}
          {tab === "deploy" && (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-md">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <CircuitBoard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Deploy Smart Contract</h2>
                    <p className="text-xs text-gray-400">Connect your wallet and launch on-chain</p>
                  </div>
                </div>

                {/* Steps indicator */}
                <div className="flex items-center gap-0 mb-6 mt-4">
                  {["Select Network", "Review", "Deploy"].map((step, i) => (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        deployStep === "done" || (deployStep === "deploying" && i < 3)
                          ? "bg-emerald-500 text-white"
                          : i === 0 ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"
                      }`}>
                        {deployStep === "done" ? <Check className="w-3 h-3" /> : i + 1}
                      </div>
                      <span className="text-[10px] text-gray-500 ml-1 flex-1">{step}</span>
                      {i < 2 && <div className="w-4 h-px bg-gray-200 mx-1" />}
                    </div>
                  ))}
                </div>

                {/* Chain selector */}
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-4 shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Network</p>
                  </div>
                  {CHAINS.map((chain, i) => (
                    <button
                      key={chain.id}
                      onClick={() => setSelectedChain(i)}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors border-b border-gray-50 last:border-0 ${
                        selectedChain === i ? "bg-indigo-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: chain.color }}
                      >
                        {chain.sym === "ETH" ? "Ξ" : chain.sym === "MATIC" ? "⬡" : "B"}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-gray-900">{chain.name}</p>
                        <p className="text-[11px] text-gray-400">Chain ID: {chain.id} · Gas: {chain.sym}</p>
                      </div>
                      {selectedChain === i && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>

                {/* Contract info */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contract to Deploy</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Template</span>
                      <span className="font-medium text-gray-700">{template?.name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Network</span>
                      <span className="font-medium text-gray-700">{CHAINS[selectedChain].name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Token Name</span>
                      <span className="font-medium text-gray-700">{config.tokenName || config.collectionName || config.daoName || "—"}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setDeployStep("connecting")}
                  disabled={deployStep !== "idle"}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-bold py-3.5 rounded-xl transition-all ${
                    deployStep === "done"
                      ? "bg-emerald-500 text-white cursor-default"
                      : deployStep !== "idle"
                      ? "bg-gray-200 text-gray-400 cursor-wait"
                      : "bg-amber-400 hover:bg-amber-500 text-black shadow-lg hover:shadow-amber-200"
                  }`}
                >
                  {deployStep === "idle" && <><Rocket className="w-4 h-4" /> Connect Wallet & Deploy</>}
                  {deployStep === "connecting" && <><Loader2 className="w-4 h-4 animate-spin" /> Connecting wallet…</>}
                  {deployStep === "deploying" && <><Loader2 className="w-4 h-4 animate-spin" /> Deploying…</>}
                  {deployStep === "done" && <><Check className="w-4 h-4" /> Deployed Successfully</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Publish modal ─────────────────────────────────────────────── */}
      {publishModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Publish Project</h3>
              <button onClick={() => setPublishModal(false)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Your app will be live at:</p>
                <p className="text-indigo-600 font-mono text-sm font-bold">https://{project?.slug}.block67.app</p>
              </div>
              <p className="text-sm text-gray-500">Publishing makes your app publicly accessible. You can take it offline at any time.</p>
              <div className="flex gap-3">
                <button onClick={() => setPublishModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={publishProject} className="flex-1 py-2.5 bg-gray-900 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Globe className="w-4 h-4" /> Publish Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
