"use client";
// User dashboard — lists all projects with quick actions
// Route: /dashboard
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/AppShell";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import {
  Plus, Zap, Clock, Globe, Code2, ChevronRight,
  MoreHorizontal, Trash2, ExternalLink, Rocket, TrendingUp,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  slug: string;
  status: string;
  updatedAt: string;
  paramValues: Record<string, string>;
  deployments: { contractAddress?: string; status: string }[];
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusDot(status: string) {
  if (status === "ACTIVE") return "bg-emerald-400";
  if (status === "DRAFT")  return "bg-gray-500";
  return "bg-gray-600";
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function deleteProject(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setOpenMenu(null);
  }

  const userName = session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "Builder";

  return (
    <AppShell user={session?.user ?? {}}>
      <div className="p-8 max-w-6xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Welcome back, {userName.split(" ")[0]} 👋
            </h1>
            <p className="text-gray-500 text-sm">
              {projects.length === 0
                ? "You don't have any projects yet. Create your first one below."
                : `You have ${projects.length} project${projects.length !== 1 ? "s" : ""}.`}
            </p>
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Link>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Total Projects",    value: projects.length.toString(),                                                icon: Code2,      color: "text-indigo-400",  bg: "bg-indigo-500/10" },
            { label: "Active Apps",       value: projects.filter((p) => p.status === "ACTIVE").length.toString(),          icon: Globe,      color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Contracts Deployed", value: projects.filter((p) => p.deployments?.[0]?.contractAddress).length.toString(), icon: Rocket, color: "text-amber-400",  bg: "bg-amber-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Projects grid ───────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-48 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const templateKey = (project.paramValues as Record<string, string>)._templateKey;
              const template = BUILTIN_TEMPLATES.find((t) => t.id === templateKey);
              const deployed = project.deployments?.[0]?.contractAddress;

              return (
                <div
                  key={project.id}
                  className="group relative bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-black/30"
                >
                  {/* Template icon + gradient */}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${template?.gradient ?? "from-gray-700 to-gray-800"} flex items-center justify-center text-xl mb-4`}>
                    {template?.icon ?? "🔧"}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot(project.status)}`} />
                    <span className="text-xs text-gray-500 uppercase tracking-wide">{project.status}</span>
                    {deployed && (
                      <span className="ml-auto text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Deployed</span>
                    )}
                  </div>

                  <h3 className="text-white font-semibold mb-1 truncate">{project.name}</h3>
                  <p className="text-xs text-gray-500 mb-4 font-mono">
                    {template?.name ?? "Custom"} · {project.slug}.block67.app
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(project.updatedAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/projects/${project.slug}`}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Zap className="w-3 h-3" />
                        Open Builder
                      </Link>
                      {/* Three-dot menu */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === project.id ? null : project.id)}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-400 hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenu === project.id && (
                          <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 w-44 py-1">
                            <Link
                              href={`/projects/${project.slug}`}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                            >
                              <Zap className="w-3.5 h-3.5" /> Open Builder
                            </Link>
                            <a
                              href={`https://${project.slug}.block67.app`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View Live
                            </a>
                            <hr className="border-gray-700 my-1" />
                            <button
                              onClick={() => deleteProject(project.id)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 w-full transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add new project card */}
            <Link
              href="/projects/new"
              className="border-2 border-dashed border-gray-800 hover:border-indigo-700 rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all hover:bg-indigo-500/5 group min-h-[200px]"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-800 group-hover:bg-indigo-600/20 flex items-center justify-center mb-3 transition-colors">
                <Plus className="w-5 h-5 text-gray-600 group-hover:text-indigo-400 transition-colors" />
              </div>
              <p className="text-gray-600 group-hover:text-gray-400 text-sm font-medium transition-colors">
                New project
              </p>
            </Link>
          </div>
        )}

        {/* ── Quick start templates ────────────────────────────────────────── */}
        {projects.length === 0 && !loading && (
          <div className="mt-12">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Quick Start Templates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {BUILTIN_TEMPLATES.map((t) => (
                <Link
                  key={t.id}
                  href={`/projects/new?template=${t.id}`}
                  className="flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-xl`}>
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{t.name}</p>
                    <p className="text-gray-500 text-xs truncate">{t.tagline}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center mb-6">
        <Rocket className="w-9 h-9 text-indigo-500" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Build your first blockchain app</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-8">
        Pick a template, describe what you want with AI, and deploy in minutes.
      </p>
      <Link
        href="/projects/new"
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        <Plus className="w-4 h-4" />
        Create First Project
      </Link>
    </div>
  );
}
