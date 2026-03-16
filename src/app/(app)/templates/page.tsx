"use client";
// Template marketplace
// Route: /templates
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/PageLayout";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import type { BuiltinTemplate } from "@/lib/templates/index";
import { Search, Check, ArrowRight } from "lucide-react";

const CATS = ["All", "TOKEN", "NFT", "DAO", "DEFI"] as const;
const CAT_LABELS: Record<string, string> = {
  All: "All", TOKEN: "Tokens", NFT: "NFT", DAO: "DAOs", DEFI: "DeFi",
};

export default function TemplatesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [q, setQ]       = useState("");
  const [cat, setCat]   = useState<string>("All");
  const [building, setBuilding] = useState<string | null>(null);

  const filtered = BUILTIN_TEMPLATES.filter((t) =>
    (cat === "All" || t.category === cat) &&
    (!q || t.name.toLowerCase().includes(q.toLowerCase()) || t.description.toLowerCase().includes(q.toLowerCase()))
  );

  async function useTemplate(t: BuiltinTemplate) {
    setBuilding(t.id);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `My ${t.name}`, templateId: t.id, paramValues: t.defaultConfig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/projects/${data.project.slug}`);
    } catch { setBuilding(null); }
  }

  return (
    <PageLayout user={session?.user ?? {}}>
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Templates</h1>
          <p className="text-gray-500 text-sm">
            Pick a template to start. Block67 generates audited, production-grade contracts instantly.
          </p>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search templates…"
              className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 placeholder-gray-400"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`text-sm px-3.5 py-2 rounded-xl transition-colors font-medium ${
                  cat === c
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300"
                }`}
              >
                {CAT_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No templates found for &quot;{q}&quot;</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="group bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md rounded-2xl overflow-hidden transition-all"
              >
                {/* Gradient banner */}
                <div className={`h-28 bg-gradient-to-br ${t.gradient} relative flex items-center justify-center`}>
                  <span className="text-5xl">{t.icon}</span>
                  <div className="absolute inset-0 bg-black/5" />
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{t.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {t.category.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-gray-500 text-[13px] mb-4 leading-relaxed line-clamp-2">{t.description}</p>

                  <div className="space-y-1 mb-4">
                    {t.features.slice(0, 3).map((f) => (
                      <div key={f} className="flex items-center gap-2 text-[12px] text-gray-500">
                        <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-gray-400 font-mono mb-4">{t.chain}</p>

                  <button
                    onClick={() => useTemplate(t)}
                    disabled={building === t.id}
                    className="flex items-center justify-between w-full bg-gray-900 hover:bg-indigo-600 disabled:bg-gray-200 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <span>{building === t.id ? "Creating project…" : "Use Template"}</span>
                    {building === t.id
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
