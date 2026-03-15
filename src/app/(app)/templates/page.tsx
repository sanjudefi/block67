"use client";
// Template marketplace — browse built-in templates
// Route: /templates
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/AppShell";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import type { BuiltinTemplate } from "@/lib/templates/index";
import { Search, ChevronRight, Zap, Check } from "lucide-react";

const CATEGORIES = ["All", "TOKEN", "NFT", "DAO", "DEFI", "LANDING_PAGE"] as const;

const CAT_LABELS: Record<string, string> = {
  All: "All",
  TOKEN: "Tokens",
  NFT: "NFT",
  DAO: "DAOs",
  DEFI: "DeFi",
  LANDING_PAGE: "Landing Pages",
};

export default function TemplatesPage() {
  const { data: session } = useSession();
  const [query, setQuery]       = useState("");
  const [category, setCategory] = useState<string>("All");

  const filtered = BUILTIN_TEMPLATES.filter((t) => {
    const matchCat = category === "All" || t.category === category;
    const matchQ   = !query || t.name.toLowerCase().includes(query.toLowerCase()) ||
                     t.description.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <AppShell user={session?.user ?? {}}>
      <div className="p-8 max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Templates</h1>
          <p className="text-gray-500 text-sm">
            Choose a template to start building. AI will help you customize it.
          </p>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search templates…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder-gray-600"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-sm px-3 py-2 rounded-xl transition-colors font-medium ${
                  category === cat
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
                }`}
              >
                {CAT_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Template grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            No templates found for &quot;{query}&quot;
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function TemplateCard({ template: t }: { template: BuiltinTemplate }) {
  return (
    <div className="group bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:shadow-black/30">
      {/* Gradient banner */}
      <div className={`h-28 bg-gradient-to-br ${t.gradient} flex items-center justify-center relative overflow-hidden`}>
        <span className="text-5xl">{t.icon}</span>
        <div className="absolute inset-0 bg-black/20" />
        {t.category === "TOKEN" && (
          <span className="absolute top-3 right-3 text-xs font-medium bg-black/40 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
            Popular
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-white font-semibold">{t.name}</h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
            {t.category.replace("_", " ")}
          </span>
        </div>

        <p className="text-gray-500 text-sm mb-4 leading-relaxed line-clamp-2">{t.description}</p>

        {/* Features */}
        <div className="space-y-1 mb-5">
          {t.features.slice(0, 3).map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs text-gray-400">
              <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>

        {/* Chain */}
        <p className="text-xs text-gray-600 mb-4 font-mono">{t.chain}</p>

        <Link
          href={`/projects/new?template=${t.id}`}
          className="flex items-center justify-between w-full bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-600/20 hover:border-indigo-600/40 text-indigo-400 text-sm font-medium px-4 py-2.5 rounded-xl transition-all group/btn"
        >
          <span className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            Use Template
          </span>
          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
