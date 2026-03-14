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

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE "users" (
    "id"            TEXT        NOT NULL,
    "email"         TEXT,
    "walletAddress" TEXT,
    "name"          TEXT,
    "avatarUrl"     TEXT,
    "password"      TEXT,
    "role"          "UserRole"  NOT NULL DEFAULT 'USER',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key"         ON "users"("email");
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");

-- ── auth_nonces ───────────────────────────────────────────────────────────────
CREATE TABLE "auth_nonces" (
    "id"        TEXT         NOT NULL,
    "address"   TEXT         NOT NULL,
    "nonce"     TEXT         NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "auth_nonces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "auth_nonces_address_key" ON "auth_nonces"("address");

-- ── chains ────────────────────────────────────────────────────────────────────
CREATE TABLE "chains" (
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
    CONSTRAINT "chains_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "chains_slug_key"    ON "chains"("slug");
CREATE UNIQUE INDEX "chains_chainId_key" ON "chains"("chainId");

-- ── templates ─────────────────────────────────────────────────────────────────
CREATE TABLE "templates" (
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
    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "templates_slug_key" ON "templates"("slug");

-- ── projects ──────────────────────────────────────────────────────────────────
CREATE TABLE "projects" (
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
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "projects_slug_key"         ON "projects"("slug");
CREATE UNIQUE INDEX "projects_customDomain_key" ON "projects"("customDomain");

-- ── deployments ───────────────────────────────────────────────────────────────
CREATE TABLE "deployments" (
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
    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- ── domain_configs ────────────────────────────────────────────────────────────
CREATE TABLE "domain_configs" (
    "id"         TEXT         NOT NULL,
    "projectId"  TEXT         NOT NULL,
    "domain"     TEXT         NOT NULL,
    "verified"   BOOLEAN      NOT NULL DEFAULT false,
    "txtRecord"  TEXT         NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    CONSTRAINT "domain_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "domain_configs_projectId_key" ON "domain_configs"("projectId");
CREATE UNIQUE INDEX "domain_configs_domain_key"    ON "domain_configs"("domain");

-- ── Foreign keys ──────────────────────────────────────────────────────────────
ALTER TABLE "templates"     ADD CONSTRAINT "templates_authorId_fkey"
    FOREIGN KEY ("authorId")    REFERENCES "users"("id")     ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "projects"      ADD CONSTRAINT "projects_ownerId_fkey"
    FOREIGN KEY ("ownerId")     REFERENCES "users"("id")     ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "projects"      ADD CONSTRAINT "projects_templateId_fkey"
    FOREIGN KEY ("templateId")  REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deployments"   ADD CONSTRAINT "deployments_projectId_fkey"
    FOREIGN KEY ("projectId")   REFERENCES "projects"("id")  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deployments"   ADD CONSTRAINT "deployments_chainId_fkey"
    FOREIGN KEY ("chainId")     REFERENCES "chains"("id")    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "domain_configs" ADD CONSTRAINT "domain_configs_projectId_fkey"
    FOREIGN KEY ("projectId")  REFERENCES "projects"("id")   ON DELETE RESTRICT ON UPDATE CASCADE;
