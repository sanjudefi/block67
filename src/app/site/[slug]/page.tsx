/**
 * Public project page — served at:
 *   pepecoin.block67.app  →  /site/pepecoin
 *   block67.app/site/pepecoin  (direct URL, no auth required)
 *
 * force-dynamic: MUST be here so Next.js never caches this page.
 * Every request fetches fresh paramValues from DB so the preview iframe
 * and the live site both show the latest frontend editor changes immediately.
 */
export const dynamic = "force-dynamic";

import { notFound }      from "next/navigation";
import { db as prisma }  from "@/lib/db/index";
import type { Metadata } from "next";
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
    description: project.description ?? `${tokenName} is a Web3 project on Block67.`,
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
        select: {
          id:              true,
          contractAddress: true,
          txHash:          true,
          deployerAddress: true,
          constructorArgs: true,
          status:          true,
          gasUsed:         true,
          errorMessage:    true,
          deployedAt:      true,
          createdAt:       true,
          chain:           true,
        },
      },
    },
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function SitePage({ params }: { params: { slug: string } }) {
  const project = await getProject(params.slug);

  if (!project || project.status === "ARCHIVED") notFound();

  const cfg        = (project.paramValues ?? {}) as Record<string, string>;
  const lastDeploy = project.deployments[0] ?? null;

  const deployment: DeploymentInfo | null = lastDeploy ? {
    contractAddress: lastDeploy.contractAddress ?? "",
    evmChainId:      lastDeploy.chain.chainId,
    chainName:       lastDeploy.chain.name,
    explorerUrl:     lastDeploy.chain.explorerUrl,
    nativeCurrency:  lastDeploy.chain.nativeCurrency,
    rpcUrl:          lastDeploy.chain.rpcUrl,
    contractAbi:     ((lastDeploy.constructorArgs as Record<string, unknown> | null)?._abi as object[] | null) ?? null,
    txHash:          lastDeploy.txHash ?? null,
  } : null;

  const projectData: ProjectData = {
    id:          project.id,
    slug:        project.slug,
    name:        project.name,
    // Use templateId from DB — authoritative source, not relying on paramValues._templateKey
    templateKey: project.templateId || cfg._templateKey || "erc20-token",
    config:      cfg,
    deployment,
  };

  // Return just the dApp — it has its own nav, sections, and footer.
  // No outer wrapper to avoid double-nav / white-background clash.
  return <ProjectDApp data={projectData} />;
}
