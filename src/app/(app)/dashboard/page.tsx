"use client";
// Dashboard — post-login home
// Route: /dashboard
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PageLayout } from "@/components/PageLayout";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import { UpgradeModal } from "@/components/UpgradeModal";
import { DomainModal }  from "@/components/DomainModal";
import {
  Clock, MoreHorizontal, Trash2, Zap, Settings2, ExternalLink,
  Plus, Palette, Globe, Rocket,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  TOKEN:        "Tokens",
  NFT:          "NFTs",
  DAO:          "DAO",
  DEFI:         "DeFi",
  LANDING_PAGE: "Gated",
  OTHER:        "Games & Growth",
};

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
  deployments?: { contractAddress?: string | null; status: string }[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [projects,        setProjects]        = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [catFilter,       setCatFilter]       = useState("ALL");
  const [openMenu,        setOpenMenu]        = useState<string | null>(null);
  const [planLimit,       setPlanLimit]       = useState(3);
  const [isPro,           setIsPro]           = useState(false);
  const [showUpgrade,     setShowUpgrade]     = useState(false);
  const [domainProject,   setDomainProject]   = useState<{ id: string; name: string; slug: string } | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects ?? []); setLoadingProjects(false); })
      .catch(() => setLoadingProjects(false));
    fetch("/api/upgrade")
      .then((r) => r.json())
      .then((d) => { setPlanLimit(d.limit ?? 3); setIsPro(d.plan === "pro"); })
      .catch(() => {});
  }, []);

  async function deleteProject(id: string) {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setOpenMenu(null);
  }

  const firstName = (session?.user?.name ?? session?.user?.email ?? "Builder").split(/[\s@]/)[0];

  function handleNewProject() {
    if (!loadingProjects && projects.length >= planLimit) {
      setShowUpgrade(true);
    } else {
      router.push("/projects/new");
    }
  }

  function handleLaunch(e: React.MouseEvent, templateId: string, prompt: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!loadingProjects && projects.length >= planLimit) {
      setShowUpgrade(true);
    } else {
      router.push(`/projects/new?template=${templateId}&prompt=${encodeURIComponent(prompt)}`);
    }
  }

  // Build category filter options
  const cats = [
    { key: "ALL", label: "All", count: BUILTIN_TEMPLATES.length },
    ...Object.entries(
      BUILTIN_TEMPLATES.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([k, n]) => ({ key: k, label: CATEGORY_LABELS[k] ?? k, count: n })),
  ];

  const filteredTemplates = catFilter === "ALL"
    ? BUILTIN_TEMPLATES
    : BUILTIN_TEMPLATES.filter((t) => t.category === catFilter);

  return (
    <PageLayout user={session?.user ?? {}}>

      {/* ════════════════════════════════════════════════════════════════════
          MY PROJECTS — top section (dark themed)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#0f1117] border-b border-white/10 px-4 pt-10 pb-12">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
            <div>
              <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-1">Welcome back, {firstName} 👋</p>
              <h1 className="text-2xl font-bold text-white">My Projects</h1>
              {!loadingProjects && (
                <p className="text-sm text-gray-400 mt-0.5">
                  <span className={projects.length >= planLimit ? "text-red-400 font-semibold" : "font-semibold text-gray-300"}>
                    {projects.length}
                  </span>
                  <span className="text-gray-500"> / {planLimit} projects used</span>
                  {isPro
                    ? <span className="ml-2 text-[10px] bg-indigo-500/20 text-indigo-400 font-bold px-1.5 py-0.5 rounded-full border border-indigo-500/30">PRO</span>
                    : <button onClick={() => setShowUpgrade(true)} className="ml-2 text-[10px] bg-white/5 hover:bg-indigo-500/20 text-gray-500 hover:text-indigo-400 font-bold px-1.5 py-0.5 rounded-full border border-white/10 transition-colors">FREE ↑ Upgrade</button>
                  }
                </p>
              )}
            </div>
            <button onClick={handleNewProject}
              className="self-start sm:self-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-900/40">
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>

          {/* Projects grid */}
          {loadingProjects ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-36 bg-white/5 rounded-2xl animate-pulse" />)}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 bg-indigo-600/10 rounded-2xl border border-indigo-500/20">
              <div className="text-5xl mb-3">🚀</div>
              <h2 className="text-lg font-bold text-white mb-1">No projects yet</h2>
              <p className="text-gray-400 text-sm mb-6 text-center max-w-xs">
                Pick a use case below and launch your first Web3 project in minutes.
              </p>
              <button onClick={handleNewProject}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-900/40">
                <Plus className="w-4 h-4" /> New Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((project) => {
                const tKey       = project.paramValues?._templateKey;
                const tmpl       = BUILTIN_TEMPLATES.find((t) => t.id === tKey);
                const isLive     = project.status === "ACTIVE";
                const isDeployed = isLive && !!project.deployments?.[0]?.contractAddress;
                return (
                  <div key={project.id}
                    className="group relative bg-white/[0.04] rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/[0.07] transition-all p-5">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tmpl?.gradient ?? "from-gray-200 to-gray-300"} flex items-center justify-center text-2xl flex-shrink-0 shadow-sm`}>
                        {tmpl?.icon ?? "🔧"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-white font-bold text-base truncate">{project.name}</h3>
                          {isDeployed
                            ? <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 flex items-center gap-0.5">
                                <Rocket className="w-2.5 h-2.5" /> Deployed
                              </span>
                            : isLive
                            ? <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                              </span>
                            : <span className="text-[10px] bg-white/5 text-gray-500 border border-white/10 px-1.5 py-0.5 rounded-full flex-shrink-0">Draft</span>
                          }
                        </div>
                        <p className="text-xs text-gray-500 truncate">{tmpl?.name ?? "Custom"} · Use Case</p>
                        <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {timeAgo(project.updatedAt)}
                        </p>
                      </div>
                      {/* 3-dot menu */}
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setOpenMenu(openMenu === project.id ? null : project.id)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenu === project.id && (
                          <div className="absolute right-0 top-8 bg-[#1a1d27] border border-white/10 rounded-xl shadow-2xl z-10 w-48 py-1">
                            {isLive && (
                              <a href={`https://${project.slug}.block67.app`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 w-full"
                                onClick={() => setOpenMenu(null)}>
                                <ExternalLink className="w-3.5 h-3.5" /> Visit Live Site
                              </a>
                            )}
                            <button onClick={() => { setOpenMenu(null); router.push(`/projects/${project.slug}`); }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 w-full">
                              <Zap className="w-3.5 h-3.5" /> Open Builder
                            </button>
                            <button onClick={() => { setOpenMenu(null); setDomainProject({ id: project.id, name: project.name, slug: project.slug }); }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 w-full">
                              <Globe className="w-3.5 h-3.5" /> Connect Domain
                            </button>
                            <button onClick={() => deleteProject(project.id)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 w-full">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button onClick={() => router.push(`/projects/${project.slug}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-300 border border-white/10 hover:border-indigo-500/30 text-gray-400 rounded-xl transition-all">
                        <Zap className="w-3.5 h-3.5" /> Builder
                      </button>
                      {isLive ? (
                        <>
                          <button onClick={() => router.push(`/projects/${project.slug}/frontend`)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 border border-violet-500/25 rounded-xl transition-all">
                            <Palette className="w-3.5 h-3.5" /> Frontend
                          </button>
                          <button onClick={() => router.push(`/projects/${project.slug}/admin`)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all">
                            <Settings2 className="w-3.5 h-3.5" /> Admin
                          </button>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-gray-600 border border-dashed border-white/10 rounded-xl py-2">
                          Deploy to unlock
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add new project card */}
              <button onClick={handleNewProject}
                className="flex flex-col items-center justify-center gap-3 bg-white/[0.03] border-2 border-dashed border-white/10 hover:border-indigo-500/40 hover:bg-indigo-600/10 rounded-2xl p-5 text-gray-600 hover:text-indigo-400 transition-all min-h-[152px] w-full">
                <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-current flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold">New Project</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          USE CASES — same dark section below
          Click card → /use-cases/[id]   |   Launch now → /projects/new
      ════════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#0f1117] border-t border-white/10 px-4 pt-12 pb-20">
        <div className="max-w-4xl mx-auto">

          {/* Section header */}
          <div className="mb-7">
            <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-1">Explore</p>
            <h2 className="text-2xl font-bold text-white">Use Cases</h2>
            <p className="text-gray-400 text-sm mt-1">
              Click any use case to see a live demo — smart contract, frontend & deployment included.
            </p>
          </div>

          {/* Category filter bar */}
          <div className="flex flex-wrap gap-2 mb-7">
            {cats.map((c) => (
              <button
                key={c.key}
                onClick={() => setCatFilter(c.key)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                  catFilter === c.key
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/40"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {c.label} <span className="opacity-60 ml-0.5">({c.count})</span>
              </button>
            ))}
          </div>

          {/* 2-column use case grid — card click → detail page */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {filteredTemplates.map((t) => (
              <Link
                key={t.id}
                href={`/use-cases/${t.id}`}
                className="group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 flex flex-col cursor-pointer"
              >
                {/* Tall gradient header with big centered icon */}
                <div className={`h-28 bg-gradient-to-br ${t.gradient} flex flex-col items-center justify-center gap-1.5 relative`}>
                  <span className="text-5xl drop-shadow-md group-hover:scale-110 transition-transform duration-200">{t.icon}</span>
                  <p className="font-bold text-white text-sm tracking-wide drop-shadow">{t.name}</p>
                  {/* Launch time badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
                    <span className="text-emerald-400 text-[10px] font-bold">⏱ {t.launchMinutes} min{t.launchMinutes !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <p className="text-sm text-gray-300 leading-relaxed">{t.tagline}</p>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{t.description}</p>

                  {/* Feature tags */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {t.features.slice(0, 4).map((f) => (
                      <span key={f} className="text-[10px] bg-white/[0.06] text-gray-400 border border-white/10 rounded-full px-2.5 py-0.5">
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                    <span className="text-[11px] text-gray-500">{t.chain.split(" / ")[0]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-indigo-400 group-hover:text-indigo-300 font-medium transition-colors">
                        View demo →
                      </span>
                      <button
                        onClick={(e) => handleLaunch(e, t.id, t.suggestedPrompts[0])}
                        className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-lg shadow-emerald-900/30"
                      >
                        🚀 Launch
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          onUpgraded={() => { setShowUpgrade(false); setPlanLimit(6); setIsPro(true); }}
          projectCount={projects.length}
          freeLimit={3}
        />
      )}

      {domainProject && (
        <DomainModal
          projectId={domainProject.id}
          projectName={domainProject.name}
          projectSlug={domainProject.slug}
          onClose={() => setDomainProject(null)}
          onUpgrade={() => { setDomainProject(null); setShowUpgrade(true); }}
        />
      )}
    </PageLayout>
  );
}
