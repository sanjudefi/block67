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
import {
  Clock, MoreHorizontal, Trash2, Zap, Settings2, ExternalLink,
  Plus, Palette, ArrowRight,
} from "lucide-react";

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

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [projects,        setProjects]        = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activeTab,       setActiveTab]       = useState<"projects" | "usecases">("projects");
  const [openMenu,        setOpenMenu]        = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects ?? []); setLoadingProjects(false); })
      .catch(() => setLoadingProjects(false));
  }, []);

  useEffect(() => {
    if (!loadingProjects && projects.length === 0) setActiveTab("usecases");
  }, [loadingProjects, projects.length]);

  async function deleteProject(id: string) {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setOpenMenu(null);
  }

  const firstName = (session?.user?.name ?? session?.user?.email ?? "Builder").split(/[\s@]/)[0];

  return (
    <PageLayout user={session?.user ?? {}}>
      <div className="max-w-[800px] mx-auto px-4 pt-10 pb-24">

        {/* ── Header row ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-gray-400 mb-0.5">Welcome back, {firstName} 👋</p>
            <h1 className="text-2xl font-bold text-gray-900">Your Web3 Projects</h1>
          </div>
          <Link href="/projects/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-md">
            <Plus className="w-4 h-4" /> New Project
          </Link>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {([
            { key: "projects",  label: "My Projects", count: projects.length },
            { key: "usecases",  label: "Use Cases",   count: null },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}>
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── My Projects ── */}
        {activeTab === "projects" && (
          <>
            {loadingProjects ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />)}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🚀</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">No projects yet</h2>
                <p className="text-gray-500 text-sm mb-6">Start with a use case or create a custom project.</p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/projects/new"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors">
                    <Plus className="w-4 h-4" /> New Project
                  </Link>
                  <button onClick={() => setActiveTab("usecases")}
                    className="flex items-center gap-2 border border-gray-200 hover:border-indigo-300 text-gray-600 hover:text-indigo-600 font-semibold text-sm px-5 py-3 rounded-xl transition-colors">
                    Browse Use Cases <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map((project) => {
                  const tKey   = project.paramValues?._templateKey;
                  const tmpl   = BUILTIN_TEMPLATES.find((t) => t.id === tKey);
                  const isLive = project.status === "ACTIVE";
                  return (
                    <div key={project.id}
                      className="group relative bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all p-5">
                      {/* Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tmpl?.gradient ?? "from-gray-200 to-gray-300"} flex items-center justify-center text-2xl flex-shrink-0 shadow-sm`}>
                          {tmpl?.icon ?? "🔧"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-gray-900 font-bold text-base truncate">{project.name}</h3>
                            {isLive
                              ? <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 flex items-center gap-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                </span>
                              : <span className="text-[10px] bg-gray-50 text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-full flex-shrink-0">Draft</span>
                            }
                          </div>
                          <p className="text-xs text-gray-500 truncate">{tmpl?.name ?? "Custom"} Use Case</p>
                          <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {timeAgo(project.updatedAt)}
                          </p>
                        </div>
                        {/* 3-dot menu */}
                        <div className="relative" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setOpenMenu(openMenu === project.id ? null : project.id)}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenu === project.id && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-48 py-1">
                              {isLive && (
                                <a href={`https://${project.slug}.block67.app`} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 w-full"
                                  onClick={() => setOpenMenu(null)}>
                                  <ExternalLink className="w-3.5 h-3.5" /> Visit Live Site
                                </a>
                              )}
                              <button onClick={() => { setOpenMenu(null); router.push(`/projects/${project.slug}`); }}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full">
                                <Zap className="w-3.5 h-3.5" /> Open Builder
                              </button>
                              <button onClick={() => deleteProject(project.id)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 w-full">
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button onClick={() => router.push(`/projects/${project.slug}`)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200 hover:border-indigo-200 text-gray-600 rounded-xl transition-all">
                          <Zap className="w-3.5 h-3.5" /> Builder
                        </button>
                        {isLive ? (
                          <>
                            <button onClick={() => router.push(`/projects/${project.slug}/frontend`)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-xl transition-all">
                              <Palette className="w-3.5 h-3.5" /> Frontend
                            </button>
                            <button onClick={() => router.push(`/projects/${project.slug}/admin`)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all">
                              <Settings2 className="w-3.5 h-3.5" /> Admin
                            </button>
                          </>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-xs text-gray-300 border border-dashed border-gray-200 rounded-xl py-2">
                            Deploy to unlock
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add new card */}
                <Link href="/projects/new"
                  className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-2xl p-5 text-gray-400 hover:text-indigo-600 transition-all min-h-[140px]">
                  <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-current flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold">New Project</span>
                </Link>
              </div>
            )}
          </>
        )}

        {/* ── Use Cases ── */}
        {activeTab === "usecases" && (
          <div>
            <p className="text-sm text-gray-500 mb-5">Choose a use case to get started — Block67 generates the smart contract and live dApp for you.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BUILTIN_TEMPLATES.map((t) => (
                <Link key={t.id} href={`/projects/new?template=${t.id}`}
                  className="group flex items-start gap-4 bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-md p-6 transition-all text-left">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-2xl flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="font-bold text-gray-900 text-base mb-1">{t.name}</p>
                    <p className="text-gray-400 text-sm leading-relaxed">{t.tagline}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-2 group-hover:text-indigo-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
