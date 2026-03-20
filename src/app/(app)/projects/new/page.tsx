"use client";
// New project wizard — prompt field + use case grid → name → create
// Route: /projects/new
export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageLayout } from "@/components/PageLayout";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import type { BuiltinTemplate } from "@/lib/templates/index";
import { ArrowLeft, ArrowRight, Zap, Send, Sparkles } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  TOKEN:        "Tokens",
  NFT:          "NFTs",
  DAO:          "DAO",
  DEFI:         "DeFi",
  LANDING_PAGE: "Gated",
  OTHER:        "Games & Growth",
};
import { generateProjectName } from "@/lib/utils/projectNames";
import { UpgradeModal } from "@/components/UpgradeModal";

type Step = "pick" | "name";

export default function NewProjectPage() {
  return (
    <Suspense>
      <NewProjectForm />
    </Suspense>
  );
}

function NewProjectForm() {
  const router  = useRouter();
  const params  = useSearchParams();
  const { data: session } = useSession();

  const preselect  = params.get("template");
  const prePrompt  = params.get("prompt") ?? "";

  const [step,        setStep]        = useState<Step>(preselect ? "name" : "pick");
  const [selected,    setSelected]    = useState<BuiltinTemplate | null>(
    preselect ? BUILTIN_TEMPLATES.find((t) => t.id === preselect) ?? null : null
  );
  const [prompt,      setPrompt]      = useState(prePrompt);
  const [projectName, setProjectName] = useState("");
  const [creating,    setCreating]    = useState(false);
  const [catFilter,   setCatFilter]   = useState("ALL");
  const [error,       setError]       = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    if (selected && !projectName) setProjectName(generateProjectName(selected.id));
  }, [selected]);

  // If user types a prompt and hits enter/submit without selecting a template,
  // pick the most relevant template based on keywords
  function inferTemplate(text: string): BuiltinTemplate {
    const t = text.toLowerCase();
    if (t.includes("nft") || t.includes("collection") || t.includes("art")) return BUILTIN_TEMPLATES.find(x => x.id === "nft-collection")!;
    if (t.includes("dao") || t.includes("governance") || t.includes("vote")) return BUILTIN_TEMPLATES.find(x => x.id === "dao-governance")!;
    if (t.includes("stake") || t.includes("staking") || t.includes("yield") || t.includes("apy")) return BUILTIN_TEMPLATES.find(x => x.id === "staking-dashboard")!;
    if (t.includes("meme") || t.includes("dog") || t.includes("pepe") || t.includes("fun")) return BUILTIN_TEMPLATES.find(x => x.id === "meme-token")!;
    return BUILTIN_TEMPLATES.find(x => x.id === "erc20-token")!;
  }

  function handlePromptSubmit() {
    if (!prompt.trim()) return;
    const tmpl = selected ?? inferTemplate(prompt);
    setSelected(tmpl);
    setStep("name");
  }

  async function create() {
    if (!selected || !projectName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res  = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        projectName.trim(),
          templateId:  selected.id,
          paramValues: selected.defaultConfig,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "PROJECT_LIMIT") {
          setProjectCount(data.count ?? 0);
          setShowUpgrade(true);
          setCreating(false);
          return;
        }
        throw new Error(data.error ?? "Failed");
      }
      // Carry prompt into the builder so the AI chat auto-fires it
      const dest = `/projects/${data.project.slug}${prompt.trim() ? `?prompt=${encodeURIComponent(prompt.trim())}` : ""}`;
      router.push(dest);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setCreating(false);
    }
  }

  return (
    <PageLayout user={session?.user ?? {}}>
      <div className="max-w-3xl mx-auto px-6 py-10">

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
              {step === "pick" ? "Start building" : "Name your project"}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {step === "pick"
                ? "Describe what you want to build, or pick a use case below"
                : "You can customize everything in the builder after creation"}
            </p>
          </div>
        </div>

        {/* ── Step 1: Pick ── */}
        {step === "pick" && (
          <>
            {/* Prompt input */}
            <div className="mb-8">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && prompt.trim()) handlePromptSubmit(); }}
                  placeholder="e.g. Create a deflationary token with 1B supply for my gaming project…"
                  className="w-full bg-white border-2 border-gray-200 focus:border-indigo-400 text-gray-900 text-sm rounded-2xl pl-12 pr-14 py-4 outline-none transition-colors placeholder-gray-300 shadow-sm"
                  autoFocus
                />
                <button
                  onClick={handlePromptSubmit}
                  disabled={!prompt.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 pl-1">
                Press Enter or click ↑ to continue · Block67 AI will configure the smart contract from your description
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">or choose a use case</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Category filter bar */}
            {(() => {
              const cats = [
                { key: "ALL", label: "All", count: BUILTIN_TEMPLATES.length },
                ...Object.entries(
                  BUILTIN_TEMPLATES.reduce((acc, t) => {
                    acc[t.category] = (acc[t.category] ?? 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([k, n]) => ({ key: k, label: CATEGORY_LABELS[k] ?? k, count: n })),
              ];
              return (
                <div className="flex flex-wrap gap-2 mb-5">
                  {cats.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setCatFilter(c.key)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                        catFilter === c.key
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                          : "bg-gray-50 border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      {c.label} <span className="opacity-60">({c.count})</span>
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Use cases grid — 2-col, same card design as homepage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BUILTIN_TEMPLATES
                .filter((t) => catFilter === "ALL" || t.category === catFilter)
                .map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelected(t); setStep("name"); }}
                  className="group text-left bg-white border border-gray-100 hover:border-indigo-300 hover:shadow-lg rounded-2xl overflow-hidden transition-all flex flex-col"
                >
                  {/* Tall gradient header with big icon */}
                  <div className={`h-24 bg-gradient-to-br ${t.gradient} flex flex-col items-center justify-center gap-1.5 relative`}>
                    <span className="text-5xl drop-shadow-md">{t.icon}</span>
                    <p className="font-bold text-white text-sm drop-shadow">{t.name}</p>
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/25 backdrop-blur-sm rounded-full px-2 py-0.5">
                      <span className="text-emerald-300 text-[10px] font-bold">⏱ {t.launchMinutes} min{t.launchMinutes !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <p className="text-xs text-gray-600 leading-relaxed">{t.tagline}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {t.features.slice(0, 3).map((f) => (
                        <span key={f} className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{f}</span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Name ── */}
        {step === "name" && selected && (
          <div className="max-w-md">
            {/* Selected template summary */}
            <div className={`bg-gradient-to-br ${selected.gradient} rounded-2xl p-5 mb-7 flex items-center gap-4`}>
              <span className="text-4xl">{selected.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold">{selected.name}</p>
                <p className="text-white/70 text-sm">{selected.tagline}</p>
              </div>
              <button onClick={() => setStep("pick")}
                className="text-white/60 hover:text-white text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors shrink-0">
                Change
              </button>
            </div>

            {/* Show prompt if provided */}
            {prompt.trim() && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
                <Zap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-indigo-700 mb-0.5">Starting prompt</p>
                  <p className="text-xs text-indigo-600 leading-relaxed">{prompt}</p>
                </div>
              </div>
            )}

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

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          onUpgraded={() => { setShowUpgrade(false); router.push("/projects/new"); }}
          projectCount={projectCount}
          freeLimit={3}
        />
      )}
    </PageLayout>
  );
}
