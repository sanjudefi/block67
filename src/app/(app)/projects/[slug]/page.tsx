"use client";
// Full-screen builder — Base44 style
// Left: AI chat plan (white) | Right: live preview with tabs
// Route: /projects/:slug
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, Zap, Globe, Rocket, Save, Check, X,
  Monitor, Tablet, Smartphone, Settings2, ChevronDown,
  Send, Mic, Plus, MoreHorizontal, RefreshCw,
} from "lucide-react";
import { TemplatePreview } from "@/lib/templates/previews";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import type { TemplateId } from "@/lib/templates/index";

type ViewMode  = "desktop" | "tablet" | "mobile";
type TabMode   = "preview" | "config" | "deploy";

interface PlanSection { heading: string; items: string[] }
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;        // plain display text
  plan?: PlanSection[]; // parsed plan for first assistant message
  ts: Date;
}
interface Project {
  id: string; name: string; slug: string; status: string;
  paramValues: Record<string, string>;
}

const DID_YOU_KNOW = [
  "Deploy to Ethereum, Base, Polygon and 12 other EVM chains",
  "Your contract ABI is saved automatically after deployment",
  "You can publish your app at yourproject.block67.app for free",
  "Connect a custom domain from project settings",
];

// Parse AI plan text into structured sections
function parsePlan(text: string): { plan: PlanSection[]; remainder: string } {
  const sections: PlanSection[] = [];
  const lines = text.split("\n");
  let current: PlanSection | null = null;
  const remainder: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Bold heading: **Heading:**
    const headingMatch = trimmed.match(/^\*\*(.+?):?\*\*:?$/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = { heading: headingMatch[1], items: [] };
    } else if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
      if (!current) current = { heading: "", items: [] };
      current.items.push(trimmed.slice(2));
    } else {
      if (current) { sections.push(current); current = null; }
      remainder.push(trimmed);
    }
  }
  if (current) sections.push(current);
  return { plan: sections, remainder: remainder.join(" ") };
}

export default function BuilderPage({ params }: { params: { slug: string } }) {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [project, setProject]     = useState<Project | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);

  const [config, setConfig]       = useState<Record<string, string>>({});
  const [templateId, setTemplateId] = useState<TemplateId>("erc20-token");

  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState("");
  const [generating, setGenerating] = useState(false);
  const [buildingRight, setBuildingRight] = useState(false); // "Building your idea..." state

  const [tab, setTab]             = useState<TabMode>("preview");
  const [viewMode, setViewMode]   = useState<ViewMode>("desktop");

  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [projectName, setProjectName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [publishModal, setPublishModal] = useState(false);
  const [deployModal, setDeployModal]   = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [didYouKnow]              = useState(() => DID_YOU_KNOW[Math.floor(Math.random() * DID_YOU_KNOW.length)]);

  const chatEndRef  = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const nameRef     = useRef<HTMLInputElement>(null);

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

  // Auto-fire prompt from URL (?prompt=...)
  useEffect(() => {
    if (!project || loading) return;
    const initialPrompt = searchParams.get("prompt");
    if (initialPrompt && messages.length === 0) {
      sendMessage(initialPrompt, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, loading]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, generating]);

  const template = BUILTIN_TEMPLATES.find((t) => t.id === templateId);

  const saveProject = useCallback(async (newConfig?: Record<string, string>, newName?: string) => {
    if (!project) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paramValues: newConfig ?? config,
          ...(newName ? { name: newName } : {}),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }, [project, config]);

  async function sendMessage(text?: string, isInitial = false) {
    const msg = (text ?? input).trim();
    if (!msg || generating) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: "user", text: msg, ts: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
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

      if (data.config && Object.keys(data.config).length > 0) {
        const newConfig = { ...config, ...data.config };
        setConfig(newConfig);
        if (project) {
          await fetch(`/api/projects/${project.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paramValues: newConfig }),
          });
        }
      }

      // Build the assistant message with plan formatting for first message
      const rawText = data.message ?? "Done! Preview updated.";
      const { plan, remainder } = isInitial
        ? parsePlan(`I'll build a **${template?.name ?? "blockchain app"}** for you. Here's my plan:\n\n**Smart Contract:**\n• ERC-20 / ${template?.name ?? "contract"} template selected\n• ${Object.entries(data.config ?? {}).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join("\n• ") || "Parameters configured"}\n\n**Frontend:**\n• Live preview ready\n• All config values applied\n\n**Next steps:**\n• Fine-tune with more prompts\n• Deploy contract to blockchain\n• Publish to block67.app\n\n${rawText}`)
        : { plan: [], remainder: rawText };

      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant",
        text: remainder, plan, ts: new Date(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant",
        text: "Sorry, something went wrong. Please try again.", plan: [], ts: new Date(),
      }]);
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

  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center gap-3">
        <p className="text-gray-800 font-semibold">Project not found</p>
        <button onClick={() => router.push("/dashboard")} className="text-indigo-600 text-sm hover:underline">
          ← Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">

      {/* ── Top Bar (Base44 style) ─────────────────────────────────────── */}
      <header className="h-11 border-b border-gray-200 flex items-center px-3 gap-2 flex-shrink-0 bg-white z-30">
        {/* Back + logo */}
        <button
          onClick={() => router.push("/dashboard")}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          {/* Editable project name */}
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
              className="text-sm font-semibold text-gray-900 bg-gray-100 border border-indigo-400 rounded-md px-2 py-0.5 outline-none max-w-[180px]"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-semibold text-gray-900 hover:text-gray-600 max-w-[180px] truncate"
            >
              {projectName}
            </button>
          )}
          <span className="text-gray-300 text-sm hidden sm:inline">·</span>
          <span className="text-xs text-gray-400 hidden sm:inline">Personal Workspace</span>
        </div>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        {/* Center tabs */}
        <div className="flex items-center gap-0.5">
          {(["preview", "config", "deploy"] as TabMode[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm px-3 py-1 rounded-lg capitalize transition-colors ${
                tab === t ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {t === "preview" ? "Preview" : t === "config" ? "Config" : "Deploy"}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* View mode (only for preview tab) */}
        {tab === "preview" && (
          <div className="hidden sm:flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 mr-1">
            {(["desktop", "tablet", "mobile"] as ViewMode[]).map((m) => {
              const icons = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };
              const Icon = icons[m];
              return (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        )}

        {/* Save */}
        <button
          onClick={() => saveProject()}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {saved ? <><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600">Saved</span></>
          : saving ? <><span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />Saving…</>
          : <><Save className="w-3.5 h-3.5" />Save</>}
        </button>

        {/* Publish */}
        <button
          onClick={() => setPublishModal(true)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            project?.status === "ACTIVE"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-gray-900 hover:bg-indigo-600 text-white"
          }`}
        >
          {project?.status === "ACTIVE" ? (
            <><Globe className="w-3.5 h-3.5" />Published</>
          ) : (
            <>Publish</>
          )}
        </button>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left panel: AI chat ───────────────────────────────────────── */}
        <div className="w-[360px] xl:w-[400px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* Empty state — waiting for first message */}
            {messages.length === 0 && !generating && (
              <div className="pt-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">block67 AI</span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">
                  I&apos;m ready to build your {template?.name ?? "blockchain app"}. What would you like to create?
                </p>
                <p className="text-gray-400 text-xs italic mb-4">Try one of these:</p>
                <div className="space-y-2">
                  {(template?.suggestedPrompts ?? []).slice(0, 3).map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="w-full text-left text-xs text-gray-600 hover:text-indigo-700 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl px-3 py-2.5 transition-all"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg, idx) => (
              <div key={msg.id}>
                {msg.role === "assistant" ? (
                  <div>
                    {/* AI header (only on first assistant message) */}
                    {idx === 0 || messages[idx - 1]?.role === "user" ? (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                          <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-gray-900">block67 AI</span>
                      </div>
                    ) : null}

                    {/* Plan sections */}
                    {msg.plan && msg.plan.length > 0 && (
                      <div className="text-sm text-gray-700 space-y-3 mb-3">
                        {msg.plan.map((section, i) => (
                          <div key={i}>
                            {section.heading && (
                              <p className="font-semibold text-gray-900 mb-1">{section.heading}:</p>
                            )}
                            {section.items.map((item, j) => (
                              <div key={j} className="flex items-start gap-2 mb-0.5">
                                <span className="text-gray-300 mt-0.5">•</span>
                                <span className="text-gray-600 text-[13px] leading-relaxed">{item}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Remainder text */}
                    {msg.text && (
                      <p className="text-[13px] text-gray-600 leading-relaxed">{msg.text}</p>
                    )}

                    <p className="text-[11px] text-gray-300 mt-2">
                      {msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ) : (
                  /* User message */
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-gray-100 rounded-2xl rounded-tr-sm px-3.5 py-2.5">
                      <p className="text-[13px] text-gray-800">{msg.text}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Generating indicator */}
            {generating && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-white animate-pulse" />
                  </div>
                  <span className="text-xs font-semibold text-gray-900">block67 AI</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ── Bottom input bar (Base44 style) ───────────────────────── */}
          <div className="border-t border-gray-200 p-3">
            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-gray-400 focus-within:bg-white transition-colors px-3 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={1}
                placeholder="What would you like to change?"
                disabled={generating}
                className="flex-1 bg-transparent text-[13px] text-gray-800 outline-none resize-none placeholder-gray-400 disabled:opacity-50 max-h-24"
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
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {/* Bottom icons */}
            <div className="flex items-center gap-2 mt-2 px-1">
              <button
                onClick={() => setShowConfigPanel(!showConfigPanel)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
              >
                <Settings2 className="w-3 h-3" />
                Config
                <ChevronDown className={`w-3 h-3 transition-transform ${showConfigPanel ? "rotate-180" : ""}`} />
              </button>
              <span className="text-gray-200">·</span>
              <button
                onClick={() => { setConfig(template?.defaultConfig ?? {}); }}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Config panel */}
            {showConfigPanel && template && (
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border-t border-gray-100 pt-2">
                {template.params.map((param) => (
                  <div key={param.key} className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-500 w-20 flex-shrink-0 truncate">{param.label}</label>
                    {param.type === "color" ? (
                      <input
                        type="color"
                        value={config[param.key] || "#6366f1"}
                        onChange={(e) => setConfig({ ...config, [param.key]: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                      />
                    ) : param.type === "boolean" ? (
                      <input
                        type="checkbox"
                        checked={config[param.key] === "true"}
                        onChange={(e) => setConfig({ ...config, [param.key]: e.target.checked ? "true" : "false" })}
                        className="rounded"
                      />
                    ) : (
                      <input
                        type="text"
                        value={config[param.key] ?? ""}
                        onChange={(e) => setConfig({ ...config, [param.key]: e.target.value })}
                        placeholder={param.placeholder}
                        className="flex-1 text-[12px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400 placeholder-gray-300"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel: Preview / Config / Deploy ─────────────────────── */}
        <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">

          {/* Preview tab */}
          {tab === "preview" && (
            <>
              {buildingRight ? (
                // "Building your idea..." state
                <div className="flex-1 flex flex-col items-center justify-center px-4">
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-6 ring-1 ring-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center animate-pulse">
                      <Zap className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Building your idea…</h2>
                  <div className="w-56 h-1 bg-gray-200 rounded-full overflow-hidden mb-6">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ animation: "progress 2s ease-in-out infinite" }}
                    />
                  </div>
                  <p className="text-sm text-gray-400 mb-1">Did you know?</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 text-center max-w-xs">
                    <span className="text-indigo-400">⟳</span>
                    {didYouKnow}
                  </p>
                  <style>{`@keyframes progress{0%{width:0;margin-left:0}50%{width:100%;margin-left:0}100%{width:0;margin-left:100%}}`}</style>
                </div>
              ) : (
                // Live preview
                <div className="flex-1 overflow-auto flex items-start justify-center p-6">
                  <div
                    className="bg-white rounded-xl overflow-hidden shadow-lg ring-1 ring-gray-200 transition-all duration-300"
                    style={{
                      width: VIEW_W[viewMode],
                      minHeight: "560px",
                      maxWidth: "100%",
                      minWidth: viewMode === "desktop" ? "860px" : undefined,
                      height: viewMode === "mobile" ? "780px" : undefined,
                    }}
                  >
                    <TemplatePreview templateId={templateId} config={config} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Config tab */}
          {tab === "config" && template && (
            <div className="flex-1 overflow-auto p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">{template.name} Config</h2>
              <p className="text-sm text-gray-500 mb-6">Directly edit your project configuration.</p>
              <div className="max-w-lg space-y-4">
                {template.params.map((param) => (
                  <div key={param.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {param.label}
                      {param.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {param.type === "color" ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={config[param.key] || "#6366f1"}
                          onChange={(e) => setConfig({ ...config, [param.key]: e.target.value })}
                          className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-sm text-gray-500 font-mono">{config[param.key]}</span>
                      </div>
                    ) : param.type === "boolean" ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config[param.key] === "true"}
                          onChange={(e) => setConfig({ ...config, [param.key]: e.target.checked ? "true" : "false" })}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-600">{config[param.key] === "true" ? "Enabled" : "Disabled"}</span>
                      </label>
                    ) : (
                      <input
                        type="text"
                        value={config[param.key] ?? ""}
                        onChange={(e) => setConfig({ ...config, [param.key]: e.target.value })}
                        placeholder={param.placeholder}
                        className="w-full bg-white border border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-gray-900 text-sm rounded-xl px-3.5 py-2.5 outline-none transition-colors placeholder-gray-300"
                      />
                    )}
                    {param.description && (
                      <p className="text-xs text-gray-400 mt-1">{param.description}</p>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => { saveProject(); setTab("preview"); }}
                  className="w-full bg-gray-900 hover:bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Save & Preview
                </button>
              </div>
            </div>
          )}

          {/* Deploy tab */}
          {tab === "deploy" && (
            <div className="flex-1 overflow-auto p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Deploy Smart Contract</h2>
              <p className="text-sm text-gray-500 mb-6">Connect your wallet and deploy to any EVM chain.</p>
              <div className="max-w-md space-y-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Network</p>
                  {[
                    { name: "Ethereum Mainnet", id: 1, logo: "Ξ", color: "#627EEA" },
                    { name: "Base", id: 8453, logo: "⬡", color: "#0052FF" },
                    { name: "Polygon", id: 137, logo: "⬡", color: "#8247E5" },
                    { name: "Sepolia Testnet", id: 11155111, logo: "Ξ", color: "#9B9B9B" },
                  ].map((chain) => (
                    <button
                      key={chain.id}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: chain.color }}>
                        {chain.logo}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{chain.name}</p>
                        <p className="text-xs text-gray-400">Chain ID: {chain.id}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm py-3 rounded-xl transition-colors"
                >
                  <Rocket className="w-4 h-4" />
                  Connect Wallet & Deploy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Publish Modal ─────────────────────────────────────────────────── */}
      {publishModal && (
        <Modal title="Publish Project" onClose={() => setPublishModal(false)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Your app will be live at:</p>
              <p className="text-indigo-600 font-mono text-sm font-semibold">
                https://{project?.slug}.block67.app
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Publishing makes your app publicly accessible. You can take it offline at any time.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPublishModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={publishProject} className="flex-1 py-2.5 bg-gray-900 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                <Globe className="w-4 h-4" /> Publish Now
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
