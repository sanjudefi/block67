# block67.app — MVP Architecture

## 1. System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              BROWSER / CLIENT                            │
│                                                                          │
│  Next.js 14 App  ←→  wagmi/viem  ←→  MetaMask (injected wallet)        │
│                                              │                           │
│                                    signs & broadcasts txs                │
└────────────────────────┬─────────────────────┼───────────────────────────┘
                         │ HTTPS / RSC          │ on-chain
                         ▼                      ▼
┌────────────────────────────────┐    ┌─────────────────────────┐
│       Vercel Edge / Node       │    │   EVM Blockchain Network │
│  ┌─────────────────────────┐   │    │  (Ethereum / Base /      │
│  │  Next.js API Routes     │   │    │   Polygon / Optimism /   │
│  │  /api/projects          │   │    │   Arbitrum)              │
│  │  /api/templates         │   │    │                          │
│  │  /api/deployments       │   │    │  Deployed Smart Contract │
│  │  /api/chains            │   │    └─────────────────────────┘
│  │  /api/domains           │   │
│  └──────────┬──────────────┘   │
│             │ Prisma ORM        │
│             ▼                  │
│  ┌─────────────────────────┐   │
│  │   PostgreSQL (Neon /    │   │
│  │   Supabase / Railway)   │   │
│  └─────────────────────────┘   │
└────────────────────────────────┘

Subdomains:  slug.block67.app  →  Vercel wildcard domain  →  Project page
Custom domain: user-domain.com  →  Vercel DNS  →  same Project page
```

---

## 2. Database Schema — Entity Relationship

```
User ──< Project >── Template
                │
                └──< Deployment >── Chain
                │
                └── DomainConfig
```

| Entity       | Key Fields                                                        |
|--------------|-------------------------------------------------------------------|
| User         | id, email, walletAddress, role                                    |
| Chain        | id, name, chainId (EIP-155), rpcUrl, networkType                 |
| Template     | id, slug, category, status, contractAbi, contractBytecode, parameters (JSON schema) |
| Project      | id, slug (subdomain), ownerId, templateId, paramValues, customDomain |
| Deployment   | id, projectId, chainId, status, contractAddress, txHash           |
| DomainConfig | id, projectId, domain, txtRecord, verified                        |

---

## 3. Next.js Folder Structure

```
src/
├── app/
│   ├── (marketing)/          # Public-facing pages (no auth required)
│   │   └── page.tsx          # Landing page
│   │
│   ├── (app)/                # Authenticated user area
│   │   ├── dashboard/        # Project overview
│   │   ├── templates/        # Browse & filter templates
│   │   │   └── [slug]/       # Template detail + param form
│   │   ├── projects/
│   │   │   ├── new/          # New project wizard
│   │   │   └── [slug]/       # Project dashboard (auto-generated UI)
│   │   └── settings/         # Account + billing
│   │
│   ├── admin/                # Admin-only (role=ADMIN)
│   │   ├── templates/        # Approve / reject template submissions
│   │   └── users/            # Manage users
│   │
│   └── api/
│       ├── projects/         # CRUD projects
│       ├── templates/        # Browse + submit templates
│       ├── deployments/      # Record deployment events
│       ├── chains/           # List supported chains
│       └── domains/          # Custom domain verification
│
├── components/
│   ├── ui/                   # Reusable primitives (Button, Card, Modal…)
│   ├── templates/            # TemplateCard, TemplateFilter, ParamForm
│   ├── deploy/               # DeployButton, ChainSelector, TxStatus
│   └── dashboard/            # MetricWidget, ActionButton, DeploymentHistory
│
├── lib/
│   ├── db/                   # Prisma singleton
│   ├── contracts/            # deploy.ts — viem deployment helper
│   └── wagmi/                # wagmiConfig
│
└── types/                    # Shared TypeScript interfaces

contracts/
├── templates/
│   ├── token/                # ERC-20 Solidity template
│   ├── nft/                  # ERC-721 / ERC-1155 templates
│   └── dao/                  # Governor + Timelock templates
└── scripts/                  # Hardhat compile + ABI extraction scripts

prisma/
└── schema.prisma

docs/
└── ARCHITECTURE.md           # This file
```

---

## 4. Main Pages

| Route                     | Purpose                                              | Auth |
|---------------------------|------------------------------------------------------|------|
| `/`                       | Marketing landing page                               | No   |
| `/templates`              | Browse approved template marketplace                 | No   |
| `/templates/:slug`        | Template detail, parameter form, "Use This" CTA      | Yes  |
| `/projects/new`           | 3-step wizard: Pick template → Fill params → Deploy  | Yes  |
| `/projects/:slug`         | Auto-generated project dashboard                     | Yes  |
| `/dashboard`              | All user projects at a glance                        | Yes  |
| `/settings`               | Profile, wallet, custom domain management            | Yes  |
| `/admin/templates`        | Review queue (PENDING_REVIEW → APPROVED/REJECTED)    | Admin|
| `/admin/users`            | User list, role management                           | Admin|
| `slug.block67.app`        | Public-facing project page (wildcard subdomain)      | No   |

---

## 5. Deployment Workflow

```
User fills template params
          │
          ▼
POST /api/projects  →  create Project (status=DRAFT)
          │
          ▼
Client: deployContract(abi, bytecode, constructorArgs)
     via viem + window.ethereum
          │
          ▼
MetaMask popup → user approves tx
          │
          ▼
tx broadcast → EVM network
          │
          ▼
POST /api/deployments  →  record {txHash, chainId, status=DEPLOYING}
          │
          ▼
Client polls tx receipt (wagmi useWaitForTransactionReceipt)
          │
    ┌─────┴──────┐
  SUCCESS       FAILED
    │              │
    ▼              ▼
PATCH /api/deployments  PATCH /api/deployments
  contractAddress        errorMessage
  status=SUCCESS         status=FAILED
    │
    ▼
PATCH /api/projects  →  status=ACTIVE
    │
    ▼
Redirect → /projects/:slug (live dashboard)
```

---

## 6. Admin Workflow — Template Approval

```
Author submits template
  POST /api/templates  →  status=PENDING_REVIEW
          │
          ▼
Admin sees queue at /admin/templates
          │
     ┌────┴────┐
  APPROVE    REJECT
     │           │
     ▼           ▼
status=APPROVED  status=REJECTED
     │           │
     ▼           ▼
Template visible  Author notified
in marketplace    (email / dashboard)
```

---

## 7. Subdomain & Custom Domain Architecture

```
Vercel project:  block67.app
Wildcard DNS:    *.block67.app  →  Vercel

Request: my-token.block67.app
  │
  ▼
Next.js middleware:
  extract subdomain from host header
  lookup Project by slug
  render /projects/[slug] with project context

Custom domain flow:
  1. User enters domain in /settings
  2. POST /api/domains  →  generate TXT record
  3. User adds TXT record in their DNS
  4. Cron / webhook verifies DNS
  5. Add domain to Vercel project via Vercel API
  6. DomainConfig.verified = true
```

---

## 8. Tech Stack Summary

| Layer           | Technology                              |
|-----------------|-----------------------------------------|
| Frontend        | Next.js 14 (App Router), TypeScript     |
| Styling         | Tailwind CSS                            |
| Wallet          | wagmi v2 + viem, MetaMask               |
| ORM             | Prisma                                  |
| Database        | PostgreSQL (Neon recommended for Vercel)|
| Auth            | NextAuth.js (email + wallet sign-in)    |
| Hosting         | Vercel (Edge + Serverless)              |
| Smart Contracts | Solidity, compiled with Hardhat         |
| Monorepo        | Single repo (app + contracts)           |

---

## 9. MVP Scope (Phase 1)

- [ ] Auth: email sign-in + wallet connect
- [ ] 3 starter templates: ERC-20 Token, ERC-721 NFT, Landing Page
- [ ] Template parameter form + validation
- [ ] MetaMask deployment flow (testnet first)
- [ ] Auto-generated project dashboard (read-only contract metrics)
- [ ] Free subdomain provisioning
- [ ] Admin template approval queue
