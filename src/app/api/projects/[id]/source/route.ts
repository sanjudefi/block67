// GET /api/projects/[id]/source?version=0.8.20[&upgradeable=true&proxyPattern=uups]
// Returns the generated Solidity source for a project.
// Uses the Block67 assembler for ALL templates — so modules like pausable/blacklist/antiwhale
// are always applied when present in the project config (_modules field).
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db as prisma } from "@/lib/db/index";
import type { TemplateId } from "@/lib/templates/index";
import { assemble } from "@/lib/contracts/assembler";
import type { ProxyPattern } from "@/lib/contracts/assembler";

/**
 * Derive module list from project config.
 *
 * Priority:
 *   1. _modules  — comma-separated list set by AI or user (e.g. "mintable,pausable,blacklist")
 *   2. Boolean config flags — backwards-compat for older projects
 */
function deriveModules(cfg: Record<string, string>, templateId: TemplateId): string[] {
  // 1. Explicit module list wins
  if (cfg._modules) {
    return cfg._modules.split(",").map((s) => s.trim()).filter(Boolean);
  }

  // 2. Fall back to boolean flags for backwards-compat
  const mods: string[] = [];

  if (templateId === "erc20-token" || templateId === "meme-token") {
    if (cfg.mintable === "true")             mods.push("mintable");
    if (cfg.burnable === "true")             mods.push("burnable");
    if (Number(cfg.taxPct) > 0 || cfg.taxable === "true") mods.push("taxable");
    if (cfg.pausable === "true")             mods.push("pausable");
    if (cfg.blacklist === "true")            mods.push("blacklist");
    if (cfg.antiwhale === "true")            mods.push("antiwhale");
    if (cfg.governance === "true")           mods.push("governance");
  }

  if (templateId === "meme-token") {
    // Meme tokens always have tax
    if (!mods.includes("taxable") && cfg.taxPct) mods.push("taxable");
    // Always mintable
    if (!mods.includes("mintable")) mods.push("mintable");
  }

  if (templateId === "nft-collection") {
    if (cfg.royaltyPct && Number(cfg.royaltyPct) > 0) mods.push("royalty");
    if (cfg.soulbound === "true")            mods.push("soulbound");
  }

  return mods;
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const version      = req.nextUrl.searchParams.get("version")       ?? "0.8.20";
  const upgradeable  = req.nextUrl.searchParams.get("upgradeable")   === "true";
  const proxyPattern = (req.nextUrl.searchParams.get("proxyPattern") ?? "uups") as ProxyPattern;

  const project = await prisma.project.findFirst({
    where: { id: params.id, ownerId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cfg        = (project.paramValues ?? {}) as Record<string, string>;
  const templateId = (cfg._templateKey ?? "erc20-token") as TemplateId;
  const modules    = deriveModules(cfg, templateId);

  const assembled = assemble({
    templateId,
    modules,
    config: cfg,
    version,
    upgradeable,
    proxyPattern: upgradeable ? proxyPattern : undefined,
  });

  return NextResponse.json({
    source:      assembled.source,
    filename:    assembled.filename,
    templateId,
    version,
    upgradeable,
    proxyPattern: upgradeable ? proxyPattern : undefined,
    modules,
  });
}
