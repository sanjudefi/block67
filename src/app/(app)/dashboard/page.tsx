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
import { ArrowRight, Clock, MoreHorizontal, Trash2, Zap } from "lucide-react";

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
  "AI auto-fills your smart contract parameters from your description",
  "Get a free subdomain like yourtoken.block67.app instantly",
  "Connect your wallet to deploy in one click after building",
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
        body: JSON.stringify({ name: `My ${template.name}`, templateId, paramValues: template.defaultConfig }),
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
          What will you{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            launch
          </span>{" "}
          next?
        </h1>
        <p className="text-gray-500 text-center mb-8 text-[15px]">
          Describe your crypto project — AI generates smart contracts and deploys to blockchain.{" "}
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
            { label: "🚀 Meme Coin",         p: "Launch a meme coin with 1 billion supply, 2% buy/sell tax and staking rewards" },
            { label: "🖼 NFT Collection",    p: "Create an ERC-721 NFT collection with 10,000 supply and 0.05 ETH mint price" },
            { label: "🏛 DAO Governance",    p: "Build a DAO with on-chain voting, proposals, timelock and multi-sig treasury" },
            { label: "💰 Staking Platform",  p: "Create a staking platform with 18% APY and flexible lock periods" },
            { label: "🔐 Multisig Wallet",   p: "Deploy a multi-sig wallet with 3-of-5 signers and spending limits" },
            { label: "📊 Tokenized Fund",    p: "Create a tokenized investment fund with ERC-20 shares and yield distribution" },
          ].map(({ label, p }) => (
            <button
              key={label}
              onClick={() => handleBuild(p)}
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
                  const tKey = project.paramValues?._templateKey;
                  const tmpl = BUILTIN_TEMPLATES.find((t) => t.id === tKey);
                  return (
                    <div
                      key={project.id}
                      className="group relative bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all p-4 cursor-pointer"
                      onClick={() => router.push(`/projects/${project.slug}`)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tmpl?.gradient ?? "from-gray-200 to-gray-300"} flex items-center justify-center text-xl flex-shrink-0`}>
                          {tmpl?.icon ?? "🔧"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-gray-900 font-semibold text-sm truncate">{project.name}</h3>
                            {project.status === "ACTIVE" && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                                Live
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono truncate">
                            {tmpl?.name ?? "Custom"} · {project.slug}.block67.app
                          </p>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
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
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-40 py-1">
                              <button
                                onClick={() => router.push(`/projects/${project.slug}`)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                              >
                                <Zap className="w-3.5 h-3.5" /> Open Builder
                              </button>
                              <button
                                onClick={() => deleteProject(project.id)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 w-full"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
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
