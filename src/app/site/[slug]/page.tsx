/**
 * Public project page — served at:
 *   pepecoin.block67.app  →  /site/pepecoin
 *   block67.app/site/pepecoin  (direct URL, no auth required)
 *
 * Server component — no authentication needed.
 * Fetches project + deployment + chain data, passes to interactive dApp shell.
 */
import { notFound }      from "next/navigation";
import { db as prisma }  from "@/lib/db/index";
import type { Metadata } from "next";
import Link              from "next/link";
import { Zap }           from "lucide-react";
import { ProjectDApp }   from "./dapp";
import type { ProjectData, DeploymentInfo } from "./dapp";

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const project = await getProject(params.slug);
  if (!project) return { title: "Not Found" };
  const cfg = (project.paramValues ?? {}) as Record<string, string>;
  const tokenName = cfg.tokenName || cfg.collectionName || cfg.daoName || project.name;
  return {
    title:       `${tokenName} — Block67`,
    description: project.description ?? `${tokenName} is a Web3 project deployed on Block67.`,
    openGraph: {
      title:       tokenName,
      description: project.description ?? `${tokenName} on Block67`,
      type:        "website",
    },
  };
}

// ── Data ──────────────────────────────────────────────────────────────────────
async function getProject(slug: string) {
  return prisma.project.findUnique({
    where:   { slug },
    include: {
      deployments: {
        orderBy: { createdAt: "desc" },
        take:    1,
        include: { chain: true },
      },
      owner: { select: { name: true, email: true } },
    },
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function SitePage({ params }: { params: { slug: string } }) {
  const project = await getProject(params.slug);

  if (!project || project.status !== "ACTIVE") notFound();

  const cfg       = (project.paramValues ?? {}) as Record<string, string>;
  const lastDeploy = project.deployments[0] ?? null;

  // Build serializable DeploymentInfo (plain object — no Prisma types)
  const deployment: DeploymentInfo | null = lastDeploy
    ? {
        contractAddress: lastDeploy.contractAddress ?? "",
        evmChainId:      lastDeploy.chain.chainId,
        chainName:       lastDeploy.chain.name,
        explorerUrl:     lastDeploy.chain.explorerUrl,
        nativeCurrency:  lastDeploy.chain.nativeCurrency,
        rpcUrl:          lastDeploy.chain.rpcUrl,
        contractAbi:     ((lastDeploy as unknown as { contractAbi: object[] | null }).contractAbi) ?? null,
        txHash:          lastDeploy.txHash ?? null,
      }
    : null;

  const projectData: ProjectData = {
    id:          project.id,
    slug:        project.slug,
    name:        project.name,
    templateKey: cfg._templateKey ?? "",
    config:      cfg,
    deployment,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Nav bar ──────────────────────────────────────────────────────── */}
      <nav className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 sticky top-0 z-20">
        <Link href="https://block67.app" className="flex items-center gap-1.5 shrink-0">
          <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold text-gray-600">block<span className="text-indigo-600">67</span></span>
        </Link>
        <span className="text-gray-200">·</span>
        <span className="text-xs text-gray-500 font-mono truncate">{params.slug}.block67.app</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>
      </nav>

      {/* ── Interactive dApp shell (client component) ─────────────────── */}
      <div className="flex-1">
        <ProjectDApp data={projectData} />
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 py-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by{" "}
          <a href="https://block67.app" className="text-indigo-600 font-semibold hover:underline">
            Block67
          </a>{" "}
          · Audited Solidity contracts · Deploy in minutes
        </p>
      </footer>
    </div>
  );
}
