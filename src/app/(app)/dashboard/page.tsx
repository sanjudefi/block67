"use client";
// post-login home — Base44-style: prompt box + recent apps
// Route: /dashboard
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PageLayout } from "@/components/PageLayout";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import type { TemplateId } from "@/lib/templates/index";
import { ArrowRight, Clock, MoreHorizontal, Trash2, Zap, Settings2, ExternalLink } from "lucide-react";
import { generateProjectName } from "@/lib/utils/projectNames";

// ── Auto-pick best template from prompt keywords ─────────────────────────────
function pickTemplate(prompt: string): TemplateId {
  const p = prompt.toLowerCase();
  if (p.includes("nft") || p.includes("collection") || p.includes("mint") || p.includes("art")) return "nft-collection";
  if (p.includes("dao") || p.includes("govern") || p.includes("vote") || p.includes("proposal")) return "dao-governance";
  if (p.includes("stake") || p.includes("staking") || p.includes("yield") || p.includes("apy") || p.includes("defi")) return "staking-dashboard";
  if (p.includes("meme") || p.includes("pepe") || p.includes("doge") || p.includes("moon") || p.includes("inu") || p.includes("shib")) return "meme-token";
  return "erc20-token";
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

interface Project {
  id: string; name: string; slug: string; status: string;
  updatedAt: string; paramValues: Record<string, string>;
}

const CHIPS = [
  "Meme Coin", "NFT Collection", "DAO Governance",
  "Staking Platform", "ERC-20 Token", "Tokenized Fund",
];

const DID_YOU_KNOW = [
  "Deploy to Ethereum, Base, Polygon and 12 other EVM chains",
  "All contracts are audited-grade, built on OpenZeppelin v5 standards",
  "Get a free subdomain like yourtoken.block67.app instantly",
  "Compile your contract online and download the full source package",
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [prompt, setPrompt]             = useState("");
  const [building, setBuilding]         = useState(false);
  const [projects, setProjects]         = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activeTab, setActiveTab]       = useState<"recent" | "templates">("recent");
  const [openMenu, setOpenMenu]         = useState<string | null>(null);
  const [didYouKnow]                    = useState(() => DID_YOU_KNOW[Math.floor(Math.random() * DID_YOU_KNOW.length)]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects ?? []); setLoadingProjects(false); })
      .catch(() => setLoadingProjects(false));
  }, []);

  // Switch to templates tab if no projects
  useEffect(() => {
    if (!loadingProjects && projects.length === 0) setActiveTab("templates");
  }, [loadingProjects, projects.length]);

  async function handleBuild(text?: string) {
    const p = (text ?? prompt).trim();
    if (!p || building) return;
    setBuilding(true);
    const templateId = pickTemplate(p);
    const template   = BUILTIN_TEMPLATES.find((t) => t.id === templateId)!;
    try {
      const res  = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: generateProjectName(templateId), templateId, paramValues: template.defaultConfig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/projects/${data.project.slug}?prompt=${encodeURIComponent(p)}`);
    } catch { setBuilding(false); }
  }

  async function deleteProject(id: string) {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setOpenMenu(null);
  }

  const firstName = (session?.user?.name ?? session?.user?.email ?? "Builder").split(/[\s@]/)[0];

  return (
    <PageLayout user={session?.user ?? {}}>
      <div className="max-w-[720px] mx-auto px-4 pt-14 pb-28">

        {/* ── Greeting ────────────────────────────────────────────────── */}
        <p className="text-center text-sm text-gray-400 mb-3">
          Welcome back, {firstName} 👋
        </p>

        {/* ── Hero heading ────────────────────────────────────────────── */}
        <h1 className="text-[2.6rem] font-bold text-gray-900 text-center leading-tight mb-2 tracking-tight">
          Launch your Web3 Project{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            in Minutes
          </span>
        </h1>
        <p className="text-gray-500 text-center mb-8 text-[15px]">
          Describe your crypto project — Block67 generates audited smart contracts, compiled and ready to deploy.{" "}
          <Link href="/templates" className="text-indigo-600 hover:underline underline-offset-2">
            Browse templates →
          </Link>
        </p>

        {/* ── Prompt box ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-[0_2px_24px_rgba(0,0,0,0.09)] border border-gray-100/80 p-4 mb-5">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleBuild(); } }}
            placeholder="Launch a meme coin called PepeCoin with 1B supply, 2% tax and staking rewards..."
            rows={3}
            disabled={building}
            className="w-full resize-none text-gray-900 text-sm leading-relaxed outline-none placeholder-gray-400 disabled:opacity-50 mb-3"
          />
          <div className="flex items-center justify-between gap-3">
            {/* Suggestion chips */}
            <div className="flex gap-1.5 flex-wrap">
              {CHIPS.slice(0, 4).map((chip) => (
                <button
                  key={chip}
                  onClick={() => { setPrompt(`Create a ${chip}`); textareaRef.current?.focus(); }}
                  className="text-xs bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-gray-200 text-gray-600 px-3 py-1 rounded-full transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
            {/* Send button */}
            <button
              onClick={() => handleBuild()}
              disabled={!prompt.trim() || building}
              className="w-9 h-9 bg-gray-900 hover:bg-indigo-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            >
              {building ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* ── Quick-launch row ────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {[
            { label: "🚀 Meme Coin",         p: "I want to launch a meme coin. " },
            { label: "🖼 NFT Collection",    p: "I want to create an NFT collection. " },
            { label: "🏛 DAO Governance",    p: "I want to build a DAO with on-chain governance. " },
            { label: "💰 Staking Platform",  p: "I want to build a staking platform. " },
            { label: "🔐 Multisig Wallet",   p: "I want to deploy a multi-sig wallet. " },
            { label: "📊 Tokenized Fund",    p: "I want to create a tokenized investment fund. " },
          ].map(({ label, p }) => (
            <button
              key={label}
              onClick={() => { setPrompt(p); setTimeout(() => textareaRef.current?.focus(), 0); }}
              className="text-xs bg-white/70 hover:bg-white border border-gray-200 hover:border-indigo-300 hover:text-indigo-700 text-gray-600 px-3.5 py-1.5 rounded-full transition-all shadow-sm"
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0.5 border-b border-gray-200 mb-5">
          {(["recent", "templates"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-sm px-3 py-2.5 border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-gray-900 text-gray-900 font-medium"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
            >
              {tab === "recent" ? "My launches" : "Templates"}
            </button>
          ))}
          {activeTab === "recent" && projects.length > 0 && (
            <span className="ml-auto text-xs text-gray-400 pb-2">
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── Recent apps ─────────────────────────────────────────────── */}
        {activeTab === "recent" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {loadingProjects
              ? [1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 bg-white rounded-xl animate-pulse border border-gray-100" />
                ))
              : projects.length === 0
              ? (
                <div className="col-span-2 text-center py-16 text-gray-400 text-sm">
                  <p className="mb-2 text-2xl">🚀</p>
                  No launches yet. Describe your first crypto project above!
                </div>
              )
              : projects.map((project) => {
                  const tKey   = project.paramValues?._templateKey;
                  const tmpl   = BUILTIN_TEMPLATES.find((t) => t.id === tKey);
                  const isLive = project.status === "ACTIVE";
                  return (
                    <div
                      key={project.id}
                      className="group relative bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all p-4"
                    >
                      {/* Top row: icon + name + status + 3-dot */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tmpl?.gradient ?? "from-gray-200 to-gray-300"} flex items-center justify-center text-xl flex-shrink-0`}>
                          {tmpl?.icon ?? "🔧"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-gray-900 font-semibold text-sm truncate">{project.name}</h3>
                            {isLive ? (
                              <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                              </span>
                            ) : (
                              <span className="text-[10px] bg-gray-50 text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-full flex-shrink-0">Draft</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{tmpl?.name ?? "Custom"}</p>
                          <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {timeAgo(project.updatedAt)}
                          </p>
                        </div>
                        {/* 3-dot menu */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setOpenMenu(openMenu === project.id ? null : project.id)}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenu === project.id && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-44 py-1">
                              {isLive && (
                                <a
                                  href={`https://${project.slug}.block67.app`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 w-full"
                                  onClick={() => setOpenMenu(null)}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Visit Live Site
                                </a>
                              )}
                              <button
                                onClick={() => { setOpenMenu(null); router.push(`/projects/${project.slug}`); }}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                              >
                                <Zap className="w-3.5 h-3.5" /> Open Builder
                              </button>
                              <button
                                onClick={() => { deleteProject(project.id); }}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 w-full"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons row */}
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Builder button — always visible */}
                        <button
                          onClick={() => router.push(`/projects/${project.slug}`)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200 hover:border-indigo-200 text-gray-600 rounded-lg transition-all"
                        >
                          <Zap className="w-3.5 h-3.5" /> Builder
                        </button>

                        {/* Admin button — only for live projects */}
                        {isLive ? (
                          <button
                            onClick={() => router.push(`/projects/${project.slug}/admin`)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all"
                          >
                            <Settings2 className="w-3.5 h-3.5" /> Manage Site
                          </button>
                        ) : (
                          <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-300 border border-dashed border-gray-200 rounded-lg">
                            Deploy to unlock
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

            {/* New project card */}
            {!loadingProjects && projects.length > 0 && (
              <button
                onClick={() => textareaRef.current?.focus()}
                className="flex items-center justify-center gap-2 bg-white border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-xl p-4 text-sm text-gray-400 hover:text-indigo-600 transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                Start new project
              </button>
            )}
          </div>
        )}

        {/* ── Templates tab ────────────────────────────────────────────── */}
        {activeTab === "templates" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BUILTIN_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleBuild(`Create a ${t.name} for my project`)}
                className="flex items-start gap-4 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm p-4 transition-all text-left"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-xl flex-shrink-0`}>
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm mb-0.5">{t.name}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{t.tagline}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        )}

        {/* ── Did you know footer ──────────────────────────────────────── */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400 mb-1">Did you know?</p>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1.5">
            <span className="text-indigo-400">⟳</span>
            {didYouKnow}
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
