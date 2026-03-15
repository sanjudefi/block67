"use client";
// New project wizard — pick template → name → create
// Route: /projects/new
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageLayout } from "@/components/PageLayout";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import type { BuiltinTemplate } from "@/lib/templates/index";
import { ArrowLeft, ArrowRight, Check, Zap } from "lucide-react";

type Step = "pick" | "name";

export default function NewProjectPage() {
  const router       = useRouter();
  const params       = useSearchParams();
  const { data: session } = useSession();

  const preselect    = params.get("template");
  const [step, setStep]             = useState<Step>(preselect ? "name" : "pick");
  const [selected, setSelected]     = useState<BuiltinTemplate | null>(
    preselect ? BUILTIN_TEMPLATES.find((t) => t.id === preselect) ?? null : null
  );
  const [projectName, setProjectName] = useState("");
  const [creating, setCreating]     = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    if (selected && !projectName) setProjectName(`My ${selected.name}`);
  }, [selected]);

  async function create() {
    if (!selected || !projectName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res  = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName.trim(), templateId: selected.id, paramValues: selected.defaultConfig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      router.push(`/projects/${data.project.slug}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setCreating(false);
    }
  }

  return (
    <PageLayout user={session?.user ?? {}}>
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => step === "name" ? setStep("pick") : router.push("/dashboard")}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === "pick" ? "Choose a template" : "Name your project"}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {step === "pick"
                ? "Select the type of blockchain app you want to build"
                : "You can customize everything in the builder after creation"}
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {(["pick", "name"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? "bg-gray-900 text-white"
                : step === "name" && s === "pick" ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-400"
              }`}>
                {step === "name" && s === "pick" ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={`text-sm ${step === s ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                {s === "pick" ? "Template" : "Name"}
              </span>
              {i === 0 && <div className="w-6 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Step 1: Pick */}
        {step === "pick" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUILTIN_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelected(t); setStep("name"); }}
                className="group text-left bg-white border border-gray-100 hover:border-indigo-300 hover:shadow-md rounded-2xl overflow-hidden transition-all"
              >
                <div className={`h-24 bg-gradient-to-br ${t.gradient} flex items-center justify-center relative`}>
                  <span className="text-4xl">{t.icon}</span>
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 mb-1">{t.name}</p>
                  <p className="text-gray-500 text-xs line-clamp-2">{t.tagline}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Name */}
        {step === "name" && selected && (
          <div className="max-w-md">
            {/* Template summary */}
            <div className={`bg-gradient-to-br ${selected.gradient} rounded-2xl p-5 mb-7 flex items-center gap-4`}>
              <span className="text-4xl">{selected.icon}</span>
              <div>
                <p className="text-white font-bold">{selected.name}</p>
                <p className="text-white/70 text-sm">{selected.tagline}</p>
              </div>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder={`My ${selected.name}`}
              autoFocus
              className="w-full bg-white border border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-gray-900 text-sm rounded-xl px-4 py-3 outline-none transition-colors placeholder-gray-300 mb-1.5"
            />
            <p className="text-xs text-gray-400 mb-6">
              Subdomain:{" "}
              <span className="font-mono text-gray-500">
                {projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my-project"}.block67.app
              </span>
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("pick")}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-3 rounded-xl transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={create}
                disabled={!projectName.trim() || creating}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-xl transition-colors"
              >
                {creating ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</>
                ) : (
                  <><Zap className="w-4 h-4" />Open Builder<ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
