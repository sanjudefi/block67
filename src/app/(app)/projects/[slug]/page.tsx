"use client";
// Full-screen builder — AI chat (30%) + live preview (70%)
// Route: /projects/:slug
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Send, Zap, Globe, Rocket, Save, ChevronDown,
  Monitor, Tablet, Smartphone, Settings2, ArrowLeft,
  Sparkles, RefreshCw, Copy, Check, X,
} from "lucide-react";
import { TemplatePreview } from "@/lib/templates/previews";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import type { TemplateId } from "@/lib/templates/index";

type ViewMode = "desktop" | "tablet" | "mobile";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  status: string;
  paramValues: Record<string, string>;
}

const VIEW_WIDTHS: Record<ViewMode, string> = {
  desktop: "100%",
  tablet:  "768px",
  mobile:  "375px",
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "intro",
    role: "assistant",
    content: "👋 I'm your AI builder. Describe what you want to change — colors, content, features — and I'll update your app live.\n\nTry: *\"Change the token name to CryptoGold\"* or *\"Make it purple themed\"*",
    timestamp: new Date(),
  },
];

export default function BuilderPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { data: session } = useSession();

  // Project state
  const [project, setProject]     = useState<Project | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);

  // Builder state
  const [config, setConfig]       = useState<Record<string, string>>({});
  const [templateId, setTemplateId] = useState<TemplateId>("erc20-token");
  const [viewMode, setViewMode]   = useState<ViewMode>("desktop");

  // Chat state
  const [messages, setMessages]   = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput]         = useState("");
  const [generating, setGenerating] = useState(false);

  // UI state
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [projectName, setProjectName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [publishModal, setPublishModal] = useState(false);
  const [deployModal, setDeployModal]   = useState(false);

  const chatEndRef   = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

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
        const tKey = pv._templateKey as TemplateId;
        if (tKey) setTemplateId(tKey);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [params.slug]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const template = BUILTIN_TEMPLATES.find((t) => t.id === templateId);

  // Save project
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
    } finally {
      setSaving(false);
    }
  }, [project, config]);

  // Send chat message → AI
  async function sendMessage() {
    const text = input.trim();
    if (!text || generating) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setGenerating(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, templateId, config }),
      });

      const data = await res.json();

      if (data.config && Object.keys(data.config).length > 0) {
        const newConfig = { ...config, ...data.config };
        setConfig(newConfig);
        // Auto-save after AI update
        if (project) {
          await fetch(`/api/projects/${project.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paramValues: newConfig }),
          });
        }
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message ?? "Done! Preview updated.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setGenerating(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Publish project
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

  if (loading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <span className="w-5 h-5 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
          Loading builder…
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <p className="text-white text-xl font-bold">Project not found</p>
        <button onClick={() => router.push("/dashboard")} className="text-indigo-400 hover:text-indigo-300 text-sm">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">

      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-3 flex-shrink-0 z-30">
        {/* Logo + back */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-bold text-white hidden sm:block">
              block<span className="text-indigo-400">67</span>
            </span>
          </div>
        </button>

        <div className="h-4 w-px bg-gray-800" />

        {/* Project name */}
        {editingName ? (
          <input
            ref={nameInputRef}
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
              if (e.key === "Enter") nameInputRef.current?.blur();
              if (e.key === "Escape") { setProjectName(project?.name ?? ""); setEditingName(false); }
            }}
            className="bg-gray-800 border border-indigo-600 text-white text-sm font-semibold px-2 py-0.5 rounded-lg outline-none max-w-[200px]"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-sm font-semibold text-white hover:text-gray-300 transition-colors flex items-center gap-1 max-w-[200px] truncate"
            title="Click to rename"
          >
            {projectName}
          </button>
        )}

        {/* Status badge */}
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          project?.status === "ACTIVE"
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "bg-gray-800 text-gray-500 border border-gray-700"
        }`}>
          {project?.status === "ACTIVE" ? "● Live" : "Draft"}
        </span>

        <div className="flex-1" />

        {/* View mode toggles */}
        <div className="hidden sm:flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
          {(["desktop", "tablet", "mobile"] as ViewMode[]).map((mode) => {
            const icons = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };
            const Icon = icons[mode];
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === mode ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
                title={mode}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        <div className="h-4 w-px bg-gray-800" />

        {/* Save */}
        <button
          onClick={() => saveProject()}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-800"
        >
          {saved ? (
            <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Saved</span></>
          ) : saving ? (
            <><span className="w-3 h-3 border border-gray-600 border-t-gray-400 rounded-full animate-spin" />Saving…</>
          ) : (
            <><Save className="w-3.5 h-3.5" />Save</>
          )}
        </button>

        {/* Deploy */}
        <button
          onClick={() => setDeployModal(true)}
          className="flex items-center gap-1.5 text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Rocket className="w-3.5 h-3.5" />
          Deploy
        </button>

        {/* Publish */}
        <button
          onClick={() => setPublishModal(true)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          Publish
        </button>
      </header>

      {/* ── Main Split Layout ──────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left Panel: AI Chat (30%) ──────────────────────────────────── */}
        <div className="w-[320px] xl:w-[360px] flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">

          {/* Panel header */}
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">AI Builder</span>
            </div>
            {template && (
              <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${template.gradient} text-white font-medium`}>
                {template.icon} {template.name}
              </span>
            )}
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-600/50 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                  </div>
                )}
                <div className={`max-w-[85%] text-sm leading-relaxed rounded-2xl px-3.5 py-2.5 ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-gray-800 text-gray-200 rounded-tl-sm"
                }`}>
                  {msg.content.split("\n").map((line, i) => {
                    // Render *italic* markdown
                    const parts = line.split(/\*([^*]+)\*/);
                    return (
                      <span key={i}>
                        {i > 0 && <br />}
                        {parts.map((part, j) =>
                          j % 2 === 1 ? <em key={j} className="italic text-indigo-300">{part}</em> : part
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Generating indicator */}
            {generating && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-600/50 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Suggestion chips */}
          {messages.length <= 2 && template && (
            <div className="px-4 py-2 border-t border-gray-800">
              <p className="text-xs text-gray-600 mb-2">Try these:</p>
              <div className="flex flex-wrap gap-1.5">
                {template.suggestedPrompts.slice(0, 3).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setInput(p); inputRef.current?.focus(); }}
                    className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2.5 py-1 rounded-full transition-colors border border-gray-700 text-left"
                  >
                    {p.length > 45 ? p.slice(0, 45) + "…" : p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Config panel toggle */}
          <div className="px-4 pb-2 pt-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center justify-between w-full text-xs text-gray-500 hover:text-gray-300 py-1.5 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Settings2 className="w-3 h-3" />
                Config fields
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showSettings ? "rotate-180" : ""}`} />
            </button>

            {showSettings && template && (
              <div className="space-y-2 pb-2 max-h-48 overflow-y-auto">
                {template.params.map((param) => (
                  <div key={param.key}>
                    <label className="block text-[10px] text-gray-600 mb-0.5 uppercase tracking-wide">{param.label}</label>
                    {param.type === "boolean" ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config[param.key] === "true"}
                          onChange={(e) => {
                            const newConfig = { ...config, [param.key]: e.target.checked ? "true" : "false" };
                            setConfig(newConfig);
                          }}
                          className="rounded"
                        />
                        <span className="text-xs text-gray-400">{config[param.key] === "true" ? "Enabled" : "Disabled"}</span>
                      </label>
                    ) : param.type === "color" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config[param.key] || "#6366f1"}
                          onChange={(e) => setConfig({ ...config, [param.key]: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs text-gray-500 font-mono">{config[param.key]}</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={config[param.key] ?? ""}
                        onChange={(e) => setConfig({ ...config, [param.key]: e.target.value })}
                        placeholder={param.placeholder}
                        className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-600 placeholder-gray-600"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="p-3 border-t border-gray-800">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Describe what to change…"
                disabled={generating}
                className="flex-1 bg-gray-800 border border-gray-700 focus:border-indigo-600 text-white text-sm rounded-xl px-3 py-2.5 outline-none resize-none placeholder-gray-600 disabled:opacity-50 transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || generating}
                className="w-9 h-9 self-end rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-600 text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-700 mt-1.5 text-center">↵ Enter to send</p>
          </div>
        </div>

        {/* ── Right Panel: Live Preview (70%) ───────────────────────────── */}
        <div className="flex-1 bg-gray-950 flex flex-col overflow-hidden">

          {/* Preview toolbar */}
          <div className="h-10 bg-gray-900/50 border-b border-gray-800 flex items-center px-4 gap-3">
            <div className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-3 py-1.5 flex-1 max-w-xs">
              <Globe className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-500 font-mono truncate">
                {project?.slug ?? "preview"}.block67.app
              </span>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => setConfig({ ...(template?.defaultConfig ?? {}) })}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
              title="Reset to defaults"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>
            <span className="text-xs text-gray-700">
              {viewMode === "desktop" ? "Full width" : viewMode === "tablet" ? "768px" : "375px"}
            </span>
          </div>

          {/* Preview area */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,_#1a1a2e_0%,_#0f0f14_70%)]">
            <div
              className="bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300"
              style={{
                width: VIEW_WIDTHS[viewMode],
                minHeight: "600px",
                maxWidth: "100%",
                height: viewMode === "mobile" ? "780px" : "auto",
                minWidth: viewMode === "desktop" ? "900px" : undefined,
              }}
            >
              <TemplatePreview templateId={templateId} config={config} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Publish Modal ─────────────────────────────────────────────────── */}
      {publishModal && (
        <Modal onClose={() => setPublishModal(false)} title="Publish Project">
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Your app will be live at:</p>
              <p className="text-indigo-400 font-mono text-sm font-semibold">
                https://{project?.slug}.block67.app
              </p>
            </div>
            <p className="text-gray-400 text-sm">
              Publishing makes your app publicly accessible. You can unpublish it at any time from project settings.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPublishModal(false)}
                className="flex-1 py-2.5 bg-gray-800 text-gray-300 text-sm rounded-xl hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={publishProject}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4" />
                Publish Now
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Deploy Modal ──────────────────────────────────────────────────── */}
      {deployModal && (
        <Modal onClose={() => setDeployModal(false)} title="Deploy Smart Contract">
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Deploy your smart contract to the blockchain. Connect your wallet and select a network.
            </p>
            <div className="space-y-2">
              {["Ethereum Mainnet", "Base", "Polygon", "Sepolia Testnet"].map((chain) => (
                <button
                  key={chain}
                  className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-3 transition-colors text-sm text-gray-300"
                >
                  <span>{chain}</span>
                  <ChevronDown className="w-4 h-4 -rotate-90 text-gray-600" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setDeployModal(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              Connect Wallet & Deploy
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
