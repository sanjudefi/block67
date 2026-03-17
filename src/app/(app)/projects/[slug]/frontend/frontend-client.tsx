"use client";
/**
 * Frontend Editor — Block67 Intelligence AI chat + live iframe preview
 *
 * Layout:
 *   Left  (400px): AI chat window — describes changes, enables sections
 *   Right (flex):  Live iframe preview of the dApp + quick-edit fields
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Send, Loader2, RefreshCw, ExternalLink,
  Globe, Palette, MessageSquare, Zap, CheckCircle2, X,
  Monitor, Tablet, Smartphone, Users, MessageCircle,
  HelpCircle, Mail, Twitter, Share2, Settings,
} from "lucide-react";

// ── Pre-built section definitions (stored as constants — not generated each time) ──

interface SectionDef {
  key:         string;
  label:       string;
  description: string;
  icon:        React.ReactNode;
  fields:      Array<{ key: string; label: string; type: "text" | "textarea" | "color" | "url" | "json"; placeholder?: string }>;
  configKey:   string; // key in config._sections
}

const SECTION_DEFS: SectionDef[] = [
  {
    key:         "team",
    label:       "Team",
    description: "Introduce your team members with names, roles and Twitter handles",
    icon:        <Users className="w-4 h-4" />,
    configKey:   "team",
    fields: [
      {
        key:         "_team_json",
        label:       "Team Members (JSON)",
        type:        "json",
        placeholder: '[{"name":"Alice","role":"CEO","bio":"Blockchain enthusiast","twitter":"@alice"}]',
      },
    ],
  },
  {
    key:         "faq",
    label:       "FAQ",
    description: "Answer common questions about your project",
    icon:        <HelpCircle className="w-4 h-4" />,
    configKey:   "faq",
    fields: [
      {
        key:         "_faq_json",
        label:       "FAQ Items (JSON)",
        type:        "json",
        placeholder: '[{"q":"What is this token?","a":"It is a decentralized token..."}]',
      },
    ],
  },
  {
    key:         "contact",
    label:       "Contact",
    description: "Add a contact email with a call-to-action section",
    icon:        <Mail className="w-4 h-4" />,
    configKey:   "contact",
    fields: [
      { key: "_contact_email", label: "Contact Email", type: "text", placeholder: "hello@yourproject.com" },
    ],
  },
  {
    key:         "social",
    label:       "Social Links",
    description: "Twitter, Telegram, Discord, GitHub follow buttons",
    icon:        <Share2 className="w-4 h-4" />,
    configKey:   "social",
    fields: [
      { key: "_social_twitter",  label: "Twitter / X",  type: "text", placeholder: "@yourhandle" },
      { key: "_social_telegram", label: "Telegram",     type: "text", placeholder: "t.me/yourgroup or @handle" },
      { key: "_social_discord",  label: "Discord",      type: "text", placeholder: "discord.gg/invite" },
      { key: "_social_github",   label: "GitHub",       type: "text", placeholder: "yourusername" },
    ],
  },
  {
    key:         "whatsapp",
    label:       "WhatsApp Button",
    description: "Floating WhatsApp contact button on the live site",
    icon:        <MessageCircle className="w-4 h-4" />,
    configKey:   "whatsapp",
    fields: [
      { key: "_whatsapp", label: "WhatsApp Number", type: "text", placeholder: "+1234567890 (with country code)" },
    ],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:   string;
  role: "user" | "assistant";
  text: string;
  ts:   Date;
  suggestions?: SectionSuggestion[];
}

interface SectionSuggestion {
  sectionKey: string;
  label:      string;
  action:     "enable" | "disable";
}

type ViewMode = "desktop" | "tablet" | "mobile";

// ── Quick-edit fields per template ────────────────────────────────────────────

const QUICK_FIELDS: Record<string, Array<{ key: string; label: string; type: "text" | "textarea" | "color" | "url" }>> = {
  "erc20-token": [
    { key: "tokenName",   label: "Token Name",    type: "text"     },
    { key: "description", label: "Description",   type: "textarea" },
    { key: "website",     label: "Website URL",   type: "url"      },
    { key: "accentColor", label: "Brand Color",   type: "color"    },
  ],
  "meme-token": [
    { key: "tokenName",   label: "Token Name",    type: "text"     },
    { key: "description", label: "Description",   type: "textarea" },
    { key: "website",     label: "Website URL",   type: "url"      },
    { key: "accentColor", label: "Brand Color",   type: "color"    },
  ],
  "nft-collection": [
    { key: "collectionName", label: "Collection Name", type: "text"     },
    { key: "description",    label: "Description",     type: "textarea" },
    { key: "website",        label: "Website URL",     type: "url"      },
    { key: "accentColor",    label: "Brand Color",     type: "color"    },
  ],
  "dao-governance": [
    { key: "daoName",     label: "DAO Name",      type: "text"     },
    { key: "description", label: "Description",   type: "textarea" },
    { key: "website",     label: "Website URL",   type: "url"      },
    { key: "accentColor", label: "Brand Color",   type: "color"    },
  ],
  "staking-dashboard": [
    { key: "tokenName",   label: "Platform Name", type: "text"     },
    { key: "description", label: "Description",   type: "textarea" },
    { key: "website",     label: "Website URL",   type: "url"      },
    { key: "accentColor", label: "Brand Color",   type: "color"    },
  ],
};

// ── AI Response Generator (Block67 Intelligence) ──────────────────────────────

function generateAIResponse(userMsg: string, currentSections: string[]): { text: string; suggestions?: SectionSuggestion[] } {
  const msg = userMsg.toLowerCase();
  const suggestions: SectionSuggestion[] = [];

  if (msg.includes("team") || msg.includes("people") || msg.includes("founders") || msg.includes("member")) {
    const enabled = currentSections.includes("team");
    suggestions.push({ sectionKey: "team", label: "Team Section", action: enabled ? "disable" : "enable" });
    return {
      text: enabled
        ? "I see the Team section is already enabled. Want me to disable it or help you update the team member info? You can edit the team JSON in the sections panel on the right."
        : "Great idea! I'll add a Team section to your site. You can then fill in each team member's name, role, bio, and Twitter handle. Click 'Enable Team Section' below to add it.",
      suggestions,
    };
  }

  if (msg.includes("faq") || msg.includes("question") || msg.includes("help") || msg.includes("answer")) {
    const enabled = currentSections.includes("faq");
    suggestions.push({ sectionKey: "faq", label: "FAQ Section", action: enabled ? "disable" : "enable" });
    return {
      text: enabled
        ? "FAQ section is active. Head to the sections panel to edit the questions and answers. Want me to suggest some common FAQ items for your project type?"
        : "An FAQ section is a great way to build trust. I'll add it so visitors can get quick answers. Click below to enable it, then fill in your questions and answers.",
      suggestions,
    };
  }

  if (msg.includes("whatsapp") || msg.includes("chat") || msg.includes("message") || msg.includes("contact")) {
    const haWhatsApp = currentSections.includes("whatsapp");
    const hasContact = currentSections.includes("contact");
    if (!haWhatsApp) suggestions.push({ sectionKey: "whatsapp", label: "WhatsApp Button", action: "enable" });
    if (!hasContact) suggestions.push({ sectionKey: "contact", label: "Contact Section", action: "enable" });
    return {
      text: "To make it easy for visitors to reach you, I can add a floating WhatsApp button and/or a contact email section. Both are one-click to enable!",
      suggestions,
    };
  }

  if (msg.includes("social") || msg.includes("twitter") || msg.includes("telegram") || msg.includes("discord") || msg.includes("follow")) {
    const enabled = currentSections.includes("social");
    suggestions.push({ sectionKey: "social", label: "Social Links", action: enabled ? "disable" : "enable" });
    return {
      text: enabled
        ? "Social links are already showing. Go to the Social Links section to update your Twitter, Telegram, Discord, or GitHub links."
        : "Adding social links helps build community! I'll enable the Social Links section — you can then add your Twitter, Telegram, Discord, and GitHub handles.",
      suggestions,
    };
  }

  if (msg.includes("color") || msg.includes("brand") || msg.includes("theme") || msg.includes("design") || msg.includes("look")) {
    return {
      text: "You can change the brand color using the 'Brand Color' field in the Quick Edit panel on the right. This color drives the entire theme — buttons, gradients, glows and accents all update instantly. Try a bold color like #f59e0b for amber or #8b5cf6 for violet!",
    };
  }

  if (msg.includes("description") || msg.includes("about") || msg.includes("text") || msg.includes("copy") || msg.includes("write")) {
    return {
      text: "Great writing makes your project stand out. Update the Description field on the right to tell your story — what makes your token/project unique, the problem it solves, and why people should care. Keep it under 200 words for best impact.",
    };
  }

  if (msg.includes("website") || msg.includes("link") || msg.includes("url")) {
    return {
      text: "You can add your project website URL in the Quick Edit panel. It will appear as a 'Website' button in the hero section of your live site, giving visitors an easy way to learn more.",
    };
  }

  if (msg.includes("section") || msg.includes("add") || msg.includes("page") || msg.includes("content")) {
    const missing = SECTION_DEFS.filter(s => !currentSections.includes(s.configKey));
    if (missing.length > 0) {
      missing.slice(0, 2).forEach(s => {
        suggestions.push({ sectionKey: s.configKey, label: s.label, action: "enable" });
      });
      return {
        text: `Here are some sections you can add to make your site more complete: ${missing.map(s => s.label).join(", ")}. Click any suggestion below to enable them instantly!`,
        suggestions,
      };
    }
    return { text: "All available sections are already enabled! You can customize each one in the Sections panel on the right." };
  }

  if (msg.includes("preview") || msg.includes("see") || msg.includes("look") || msg.includes("site")) {
    return {
      text: "The live preview on the right shows exactly how your dApp looks to visitors. Changes you save in the Quick Edit panel are reflected live immediately. Use the device buttons to preview on mobile, tablet, or desktop.",
    };
  }

  // Default response
  return {
    text: `I'm Block67 Intelligence — here to help you customize your dApp's frontend. Here's what I can help with:\n\n• **Brand & Design** — colors, description, name\n• **Sections** — Team, FAQ, Contact, Social Links, WhatsApp\n• **Links** — website, social media handles\n\nWhat would you like to change?`,
  };
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function FrontendClient({
  projectId, projectSlug, projectName, templateKey, config: initialConfig, isLive,
}: {
  projectId: string; projectSlug: string; projectName: string;
  templateKey: string; config: Record<string, string>; isLive: boolean;
}) {
  const [config,    setConfig]   = useState<Record<string, string>>(initialConfig);
  const [pending,   setPending]  = useState<Record<string, string>>({});
  const [saving,    setSaving]   = useState(false);
  const [saved,     setSaved]    = useState(false);
  const [msgs,      setMsgs]     = useState<ChatMessage[]>([
    {
      id:   "welcome",
      role: "assistant",
      text: `Welcome to the Frontend Editor for **${projectName}**! 🎨\n\nI'm Block67 Intelligence. Tell me what you'd like to change on your live site — colors, sections like Team or FAQ, social links, WhatsApp button, and more.\n\nWhat would you like to add or change?`,
      ts:   new Date(),
    },
  ]);
  const [input,     setInput]    = useState("");
  const [thinking,  setThinking] = useState(false);
  const [viewMode,  setViewMode] = useState<ViewMode>("desktop");
  const [iframeKey, setIframeKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"chat" | "sections">("chat");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // Current active sections
  const activeSections = (config._sections || "").split(",").map(s => s.trim()).filter(Boolean);

  const liveUrl = `${process.env.NEXT_PUBLIC_SITE_BASE_URL?.replace("{slug}", projectSlug) ?? `https://${projectSlug}.block67.app`}`;

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Merge pending into config (for preview)
  const mergedConfig = { ...config, ...pending };

  const quickFields = QUICK_FIELDS[templateKey] ?? QUICK_FIELDS["erc20-token"];

  // Save config to DB
  const saveConfig = useCallback(async (updates: Record<string, string>) => {
    setSaving(true);
    setSaved(false);
    try {
      const newConfig = { ...config, ...updates };
      const res = await fetch(`/api/projects/${projectId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ paramValues: newConfig }),
      });
      if (res.ok) {
        setConfig(newConfig);
        setPending({});
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        setIframeKey(k => k + 1);
      }
    } finally { setSaving(false); }
  }, [config, projectId]);

  // Toggle section on/off
  const toggleSection = useCallback((sectionKey: string) => {
    const current = new Set((config._sections || "").split(",").map(s => s.trim()).filter(Boolean));
    if (current.has(sectionKey)) current.delete(sectionKey);
    else current.add(sectionKey);
    const newSections = Array.from(current).join(",");
    saveConfig({ _sections: newSections });
  }, [config._sections, saveConfig]);

  // Enable section from AI suggestion
  const enableSection = useCallback((sectionKey: string, action: "enable" | "disable") => {
    const current = new Set((config._sections || "").split(",").map(s => s.trim()).filter(Boolean));
    if (action === "enable") current.add(sectionKey);
    else current.delete(sectionKey);
    saveConfig({ _sections: Array.from(current).join(",") });
  }, [config._sections, saveConfig]);

  // Send chat message
  const sendMsg = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text, ts: new Date() };
    setMsgs(prev => [...prev, userMsg]);
    setThinking(true);

    // Simulate AI thinking delay
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));

    const current = (config._sections || "").split(",").map(s => s.trim()).filter(Boolean);
    const { text: aiText, suggestions } = generateAIResponse(text, current);

    const aiMsg: ChatMessage = {
      id:   (Date.now() + 1).toString(),
      role: "assistant",
      text: aiText,
      ts:   new Date(),
      suggestions,
    };
    setMsgs(prev => [...prev, aiMsg]);
    setThinking(false);
  }, [input, thinking, config._sections]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  const iframeWidth = viewMode === "desktop" ? "100%" : viewMode === "tablet" ? "768px" : "390px";

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
      {/* ── Top bar ── */}
      <header className="h-12 border-b border-white/10 flex items-center gap-3 px-4 shrink-0"
        style={{ background: "rgba(10,10,15,0.95)" }}>
        <Link href={`/projects/${projectSlug}`}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Palette className="w-4 h-4 text-violet-400" />
          <span className="font-semibold text-sm text-white truncate">{projectName}</span>
          <span className="text-white/30 text-xs">— Frontend Editor</span>
        </div>
        <div className="flex items-center gap-1 border border-white/15 rounded-lg p-1">
          {(["desktop","tablet","mobile"] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-2 py-1 rounded text-xs transition-colors ${viewMode === m ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"}`}>
              {m === "desktop" ? <Monitor className="w-3.5 h-3.5" /> : m === "tablet" ? <Tablet className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
        {isLive && (
          <a href={liveUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 rounded-lg transition-colors">
            <Globe className="w-3.5 h-3.5" /> Live Site <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <button onClick={() => saveConfig(pending)} disabled={saving || Object.keys(pending).length === 0}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-30 text-white"
          style={{ background: Object.keys(pending).length > 0 ? "#8b5cf6" : "rgba(255,255,255,0.1)" }}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Zap className="w-3.5 h-3.5" />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: AI Chat + Sections ── */}
        <aside className="w-[380px] shrink-0 border-r border-white/10 flex flex-col overflow-hidden"
          style={{ background: "rgba(15,15,20,0.98)" }}>
          {/* Tab bar */}
          <div className="flex border-b border-white/10">
            {(["chat","sections"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors capitalize flex items-center justify-center gap-1.5 ${activeTab === tab ? "text-violet-400 border-b-2 border-violet-500" : "text-white/40 hover:text-white/70"}`}>
                {tab === "chat" ? <><MessageSquare className="w-3.5 h-3.5" /> Intelligence</> : <><Settings className="w-3.5 h-3.5" /> Sections</>}
              </button>
            ))}
          </div>

          {/* Chat pane */}
          {activeTab === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {msgs.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] ${msg.role === "user" ? "order-1" : "order-none"}`}>
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                            <Zap className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-[11px] text-white/40">Block67 Intelligence</span>
                        </div>
                      )}
                      <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-violet-600 text-white"
                          : "bg-white/8 text-white/85 border border-white/10"
                      }`}
                        style={msg.role === "assistant" ? { background: "rgba(255,255,255,0.05)" } : {}}>
                        {msg.text.split("**").map((part, i) =>
                          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                        )}
                      </div>
                      {/* Suggestions */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.suggestions.map(s => (
                            <button key={s.sectionKey} onClick={() => enableSection(s.sectionKey, s.action)}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                                s.action === "enable"
                                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300 hover:bg-violet-500/30"
                                  : "bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30"
                              }`}>
                              {s.action === "enable" ? "+" : "×"} {s.action === "enable" ? "Enable" : "Remove"} {s.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Block67 Intelligence is thinking…
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-white/10">
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me to add a team section, change colors, add WhatsApp…"
                    rows={2}
                    className="flex-1 text-sm rounded-xl px-3 py-2.5 outline-none resize-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50"
                  />
                  <button onClick={sendMsg} disabled={!input.trim() || thinking}
                    className="w-9 h-9 mt-auto rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 flex items-center justify-center transition-colors">
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Sections pane */}
          {activeTab === "sections" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-white/40 mb-4">Enable optional page sections. All changes save and go live immediately.</p>
              {SECTION_DEFS.map(section => {
                const isEnabled = activeSections.includes(section.configKey);
                return (
                  <div key={section.key} className="rounded-xl border border-white/10 overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="flex items-center gap-3 p-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isEnabled ? "bg-violet-600" : "bg-white/10"
                      }`}>
                        {section.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{section.label}</p>
                        <p className="text-xs text-white/40 truncate">{section.description}</p>
                      </div>
                      <button onClick={() => toggleSection(section.configKey)}
                        className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${isEnabled ? "bg-violet-600" : "bg-white/20"}`}
                        style={{ height: "1.375rem" }}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          isEnabled ? "translate-x-5" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>

                    {/* Section fields (when enabled) */}
                    {isEnabled && (
                      <div className="border-t border-white/10 px-3 pb-3 pt-2 space-y-2">
                        {section.fields.map(field => (
                          <div key={field.key}>
                            <label className="text-[11px] text-white/40 uppercase tracking-wider block mb-1">{field.label}</label>
                            <textarea
                              value={mergedConfig[field.key] || ""}
                              onChange={(e) => setPending(p => ({ ...p, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              rows={field.type === "json" ? 4 : 2}
                              className="w-full text-xs rounded-lg px-2.5 py-2 outline-none resize-none bg-white/5 border border-white/15 text-white placeholder-white/20 focus:border-violet-500/50 font-mono"
                            />
                          </div>
                        ))}
                        {Object.keys(pending).some(k => section.fields.some(f => f.key === k)) && (
                          <button onClick={() => saveConfig(pending)}
                            className="w-full py-1.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors">
                            {saving ? "Saving…" : "Save Section"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* ── Center: Quick-edit + iframe ── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-900">
          {/* Quick-edit strip */}
          <div className="border-b border-white/10 px-4 py-3 flex items-end gap-4 overflow-x-auto shrink-0"
            style={{ background: "rgba(10,10,15,0.95)" }}>
            {quickFields.map(field => (
              <div key={field.key} className="min-w-[160px]">
                <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">{field.label}</label>
                {field.type === "color" ? (
                  <div className="flex items-center gap-2">
                    <input type="color"
                      value={mergedConfig[field.key] || "#6366f1"}
                      onChange={(e) => setPending(p => ({ ...p, [field.key]: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 bg-transparent"
                    />
                    <span className="text-xs text-white/50 font-mono">{mergedConfig[field.key] || "#6366f1"}</span>
                  </div>
                ) : field.type === "textarea" ? (
                  <textarea
                    value={mergedConfig[field.key] || ""}
                    onChange={(e) => setPending(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={`${field.label}…`}
                    rows={2}
                    className="w-full text-xs rounded-lg px-2.5 py-2 outline-none resize-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50"
                  />
                ) : (
                  <input
                    type={field.type === "url" ? "url" : "text"}
                    value={mergedConfig[field.key] || ""}
                    onChange={(e) => setPending(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={`${field.label}…`}
                    className="w-full text-xs rounded-lg px-2.5 py-2 outline-none bg-white/5 border border-white/15 text-white placeholder-white/30 focus:border-violet-500/50"
                  />
                )}
              </div>
            ))}
            <div className="flex-none ml-auto flex items-center gap-2">
              <button onClick={() => setIframeKey(k => k + 1)}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 border border-white/15 px-2.5 py-1.5 rounded-lg transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              {Object.keys(pending).length > 0 && (
                <button onClick={() => saveConfig(pending)} disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Apply
                </button>
              )}
            </div>
          </div>

          {/* Iframe preview */}
          <div className="flex-1 overflow-hidden flex items-center justify-center p-4"
            style={{ background: "#111118" }}>
            {isLive ? (
              <div className="relative h-full transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden border border-white/10"
                style={{ width: iframeWidth, maxWidth: "100%", maxHeight: "100%" }}>
                <iframe
                  key={iframeKey}
                  src={liveUrl}
                  className="w-full h-full"
                  style={{ border: "none", display: "block" }}
                  title="Live site preview"
                />
              </div>
            ) : (
              <div className="text-center max-w-sm">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-7 h-7 text-violet-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Deploy first to see live preview</h3>
                <p className="text-white/50 text-sm mb-6">
                  Once you deploy your contract, the live site will appear here and you can edit it in real time.
                </p>
                <Link href={`/projects/${projectSlug}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm rounded-xl transition-colors">
                  <Zap className="w-4 h-4" /> Go to Builder
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
