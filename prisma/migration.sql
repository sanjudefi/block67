-- block67.app — Full schema migration
-- Run this in: Prisma Data Platform → your project → Data Browser → SQL Editor
-- Or in any PostgreSQL client connected to your database

-- ── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE "UserRole"         AS ENUM ('USER', 'ADMIN');
CREATE TYPE "ProjectStatus"    AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "TemplateCategory" AS ENUM ('TOKEN', 'NFT', 'DAO', 'LANDING_PAGE', 'DEFI', 'OTHER');
CREATE TYPE "TemplateStatus"   AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'DEPLOYING', 'SUCCESS', 'FAILED');
CREATE TYPE "NetworkType"      AS ENUM ('MAINNET', 'TESTNET');

-- ── block67_users ─────────────────────────────────────────────────────────────
CREATE TABLE "block67_users" (
    "id"            TEXT        NOT NULL,
    "email"         TEXT,
    "walletAddress" TEXT,
    "name"          TEXT,
    "avatarUrl"     TEXT,
    "password"      TEXT,
    "role"          "UserRole"  NOT NULL DEFAULT 'USER',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "block67_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "block67_users_email_key"         ON "block67_users"("email");
CREATE UNIQUE INDEX "block67_users_walletAddress_key" ON "block67_users"("walletAddress");

-- ── block67_auth_nonces ───────────────────────────────────────────────────────
CREATE TABLE "block67_auth_nonces" (
    "id"        TEXT         NOT NULL,
    "address"   TEXT         NOT NULL,
    "nonce"     TEXT         NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "block67_auth_nonces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "block67_auth_nonces_address_key" ON "block67_auth_nonces"("address");

-- ── block67_chains ────────────────────────────────────────────────────────────
CREATE TABLE "block67_chains" (
    "id"             TEXT          NOT NULL,
    "name"           TEXT          NOT NULL,
    "slug"           TEXT          NOT NULL,
    "chainId"        INTEGER       NOT NULL,
    "rpcUrl"         TEXT          NOT NULL,
    "explorerUrl"    TEXT          NOT NULL,
    "nativeCurrency" TEXT          NOT NULL,
    "networkType"    "NetworkType" NOT NULL DEFAULT 'MAINNET',
    "logoUrl"        TEXT,
    "isActive"       BOOLEAN       NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "block67_chains_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "block67_chains_slug_key"    ON "block67_chains"("slug");
CREATE UNIQUE INDEX "block67_chains_chainId_key" ON "block67_chains"("chainId");

-- ── block67_templates ─────────────────────────────────────────────────────────
CREATE TABLE "block67_templates" (
    "id"               TEXT               NOT NULL,
    "name"             TEXT               NOT NULL,
    "slug"             TEXT               NOT NULL,
    "description"      TEXT               NOT NULL,
    "category"         "TemplateCategory" NOT NULL,
    "status"           "TemplateStatus"   NOT NULL DEFAULT 'PENDING_REVIEW',
    "previewUrl"       TEXT,
    "repoUrl"          TEXT,
    "contractAbi"      JSONB,
    "contractBytecode" TEXT,
    "parameters"       JSONB              NOT NULL,
    "frontendConfig"   JSONB,
    "authorId"         TEXT               NOT NULL,
    "isFeatured"       BOOLEAN            NOT NULL DEFAULT false,
    "createdAt"        TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "block67_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "block67_templates_slug_key" ON "block67_templates"("slug");

-- ── block67_projects ──────────────────────────────────────────────────────────
CREATE TABLE "block67_projects" (
    "id"           TEXT            NOT NULL,
    "name"         TEXT            NOT NULL,
    "slug"         TEXT            NOT NULL,
    "description"  TEXT,
    "status"       "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerId"      TEXT            NOT NULL,
    "templateId"   TEXT            NOT NULL,
    "paramValues"  JSONB           NOT NULL,
    "customDomain" TEXT,
    "logoUrl"      TEXT,
    "createdAt"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "block67_projects_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "block67_projects_slug_key"         ON "block67_projects"("slug");
CREATE UNIQUE INDEX "block67_projects_customDomain_key" ON "block67_projects"("customDomain");

-- ── block67_deployments ───────────────────────────────────────────────────────
CREATE TABLE "block67_deployments" (
    "id"              TEXT               NOT NULL,
    "projectId"       TEXT               NOT NULL,
    "chainId"         TEXT               NOT NULL,
    "status"          "DeploymentStatus" NOT NULL DEFAULT 'PENDING',
    "contractAddress" TEXT,
    "txHash"          TEXT,
    "deployerAddress" TEXT               NOT NULL,
    "constructorArgs" JSONB,
    "gasUsed"         TEXT,
    "errorMessage"    TEXT,
    "deployedAt"      TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "block67_deployments_pkey" PRIMARY KEY ("id")
);

-- ── block67_domain_configs ────────────────────────────────────────────────────
CREATE TABLE "block67_domain_configs" (
    "id"         TEXT         NOT NULL,
    "projectId"  TEXT         NOT NULL,
    "domain"     TEXT         NOT NULL,
    "verified"   BOOLEAN      NOT NULL DEFAULT false,
    "txtRecord"  TEXT         NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    CONSTRAINT "block67_domain_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "block67_domain_configs_projectId_key" ON "block67_domain_configs"("projectId");
CREATE UNIQUE INDEX "block67_domain_configs_domain_key"    ON "block67_domain_configs"("domain");

-- ── contractAbi column (added after initial deploy) ──────────────────────────
ALTER TABLE "block67_deployments" ADD COLUMN IF NOT EXISTS "contractAbi" JSONB;

-- ── block67_dapp_users (end-users who connect wallets to published dApps) ─────
CREATE TABLE IF NOT EXISTS "block67_dapp_users" (
    "id"            TEXT         NOT NULL,
    "projectId"     TEXT         NOT NULL,
    "walletAddress" TEXT         NOT NULL,
    "firstSeenAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "block67_dapp_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "block67_dapp_users_projectId_walletAddress_key"
    ON "block67_dapp_users"("projectId", "walletAddress");
ALTER TABLE "block67_dapp_users" ADD CONSTRAINT "block67_dapp_users_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "block67_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Foreign keys ──────────────────────────────────────────────────────────────
ALTER TABLE "block67_templates"     ADD CONSTRAINT "block67_templates_authorId_fkey"
    FOREIGN KEY ("authorId")    REFERENCES "block67_users"("id")      ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "block67_projects"      ADD CONSTRAINT "block67_projects_ownerId_fkey"
    FOREIGN KEY ("ownerId")     REFERENCES "block67_users"("id")      ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "block67_projects"      ADD CONSTRAINT "block67_projects_templateId_fkey"
    FOREIGN KEY ("templateId")  REFERENCES "block67_templates"("id")  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "block67_deployments"   ADD CONSTRAINT "block67_deployments_projectId_fkey"
    FOREIGN KEY ("projectId")   REFERENCES "block67_projects"("id")   ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "block67_deployments"   ADD CONSTRAINT "block67_deployments_chainId_fkey"
    FOREIGN KEY ("chainId")     REFERENCES "block67_chains"("id")     ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "block67_domain_configs" ADD CONSTRAINT "block67_domain_configs_projectId_fkey"
    FOREIGN KEY ("projectId")  REFERENCES "block67_projects"("id")    ON DELETE RESTRICT ON UPDATE CASCADE;
