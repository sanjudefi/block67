"use client";
// New Project wizard — pick template → name project → create
// Route: /projects/new
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/AppShell";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import type { BuiltinTemplate } from "@/lib/templates/index";
import { ArrowLeft, ArrowRight, Check, Zap } from "lucide-react";

type Step = "pick-template" | "configure";

export default function NewProjectPage() {
  const router       = useRouter();
  const params       = useSearchParams();
  const { data: session } = useSession();

  const preselect    = params.get("template");
  const [step, setStep]           = useState<Step>(preselect ? "configure" : "pick-template");
  const [selected, setSelected]   = useState<BuiltinTemplate | null>(
    preselect ? BUILTIN_TEMPLATES.find((t) => t.id === preselect) ?? null : null
  );
  const [projectName, setProjectName] = useState("");
  const [creating, setCreating]   = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    if (selected && !projectName) {
      setProjectName(`My ${selected.name}`);
    }
  }, [selected]);

  async function create() {
    if (!selected || !projectName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          templateId: selected.id,
          paramValues: selected.defaultConfig,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create project");
      router.push(`/projects/${data.project.slug}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setCreating(false);
    }
  }

  return (
    <AppShell user={session?.user ?? {}}>
      <div className="p-8 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => step === "configure" ? setStep("pick-template") : router.push("/dashboard")}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">
              {step === "pick-template" ? "Choose a template" : `Configure "${selected?.name}"`}
            </h1>
            <p className="text-gray-500 text-sm">
              {step === "pick-template"
                ? "Select the type of blockchain app you want to build"
                : "Give your project a name — you can customize everything in the builder"}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(["pick-template", "configure"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors ${
                step === s
                  ? "bg-indigo-600 text-white"
                  : (step === "configure" && s === "pick-template")
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-800 text-gray-500"
              }`}>
                {step === "configure" && s === "pick-template" ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={`text-sm ${step === s ? "text-white font-medium" : "text-gray-600"}`}>
                {s === "pick-template" ? "Choose Template" : "Name Project"}
              </span>
              {i === 0 && <div className="w-8 h-px bg-gray-800" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Pick template ──────────────────────────────────────── */}
        {step === "pick-template" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {BUILTIN_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelected(t); setStep("configure"); }}
                className="group text-left bg-gray-900 border border-gray-800 hover:border-indigo-600/50 rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:shadow-indigo-950/50"
              >
                <div className={`h-24 bg-gradient-to-br ${t.gradient} flex items-center justify-center relative`}>
                  <span className="text-4xl">{t.icon}</span>
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold mb-1">{t.name}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{t.tagline}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {t.features.slice(0, 2).map((f) => (
                      <span key={f} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Step 2: Configure ─────────────────────────────────────────── */}
        {step === "configure" && selected && (
          <div className="max-w-lg">
            {/* Selected template summary */}
            <div className={`bg-gradient-to-br ${selected.gradient} rounded-2xl p-5 mb-8 flex items-center gap-4`}>
              <span className="text-4xl">{selected.icon}</span>
              <div>
                <p className="text-white font-bold">{selected.name}</p>
                <p className="text-white/70 text-sm">{selected.tagline}</p>
              </div>
            </div>

            {/* Project name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder={`My ${selected.name}`}
                className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-white text-sm rounded-xl px-4 py-3 outline-none transition-colors placeholder-gray-600"
                autoFocus
              />
              <p className="text-xs text-gray-600 mt-2">
                Subdomain: <span className="text-gray-500 font-mono">
                  {projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my-project"}.block67.app
                </span>
              </p>
            </div>

            {/* Features */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Included features</p>
              <div className="space-y-2">
                {selected.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("pick-template")}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium px-4 py-3 rounded-xl transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={create}
                disabled={!projectName.trim() || creating}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
              >
                {creating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Create & Open Builder
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
