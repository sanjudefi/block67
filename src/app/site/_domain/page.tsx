/**
 * Custom-domain entry point — middleware rewrites any unknown host to:
 *   /site/_domain?domain=mytoken.com
 *
 * This page looks up the domain in DB (DomainConfig or Project.customDomain)
 * and renders the same dApp content as /site/[slug].
 *
 * The URL shown to the visitor stays as their custom domain.
 */
export const dynamic = "force-dynamic";

import { unstable_noStore } from "next/cache";
import { notFound }         from "next/navigation";
import { db as prisma }     from "@/lib/db/index";
import type { Metadata }    from "next";
import { ProjectDApp }      from "@/app/site/[slug]/dapp";
import type { ProjectData, DeploymentInfo } from "@/app/site/[slug]/dapp";

async function getProjectByDomain(domain: string) {
  // 1. Look up via DomainConfig table
  const domainConfig = await prisma.domainConfig.findFirst({
    where:   { domain: domain.toLowerCase() },
    include: {
      project: {
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
      },
    },
  });

  if (domainConfig) {
    console.info(`[_domain] domain=${domain} → slug=${domainConfig.project.slug} (via DomainConfig)`);
    return domainConfig.project;
  }

  // 2. Fallback: look up via Project.customDomain field
  const project = await prisma.project.findFirst({
    where: { customDomain: domain.toLowerCase() },
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

  if (project) {
    console.info(`[_domain] domain=${domain} → slug=${project.slug} (via Project.customDomain)`);
    return project;
  }

  console.warn(`[_domain] domain=${domain} not found in DB`);
  return null;
}

export async function generateMetadata(
  { searchParams }: { searchParams: { domain?: string } }
): Promise<Metadata> {
  const domain  = (searchParams.domain ?? "").split(":")[0];
  const project = await getProjectByDomain(domain);
  if (!project) return { title: "Not Found" };
  const cfg       = (project.paramValues ?? {}) as Record<string, string>;
  const tokenName = cfg.tokenName || cfg.collectionName || cfg.daoName || project.name;
  return {
    title:       `${tokenName} — Block67`,
    description: project.description ?? `${tokenName} is a Web3 project on Block67.`,
    openGraph:   { title: tokenName, type: "website" },
  };
}

export default async function DomainPage({
  searchParams,
}: {
  searchParams: { domain?: string; preview?: string };
}) {
  unstable_noStore();

  const domain  = (searchParams.domain ?? "").split(":")[0]; // strip port if any
  if (!domain) notFound();

  const project = await getProjectByDomain(domain);
  if (!project || project.status === "ARCHIVED") notFound();

  const allValues = (project.paramValues ?? {}) as Record<string, string>;

  let cfg: Record<string, string>;
  if (searchParams.preview === "1") {
    cfg = allValues;
  } else if (allValues._publishedSnapshot) {
    try { cfg = JSON.parse(allValues._publishedSnapshot) as Record<string, string>; }
    catch { cfg = allValues; }
  } else {
    cfg = allValues;
  }

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
    templateKey: project.templateId || cfg._templateKey || "erc20-token",
    config:      cfg,
    deployment,
  };

  return <ProjectDApp data={projectData} />;
}
