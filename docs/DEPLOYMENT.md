# block67.app — First Deployment Checklist

## 1. Vercel Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Pooled connection (Neon: use the pooler URL) |
| `DATABASE_ANY_CLIENT` | `postgresql://...` | Direct connection (Neon: use the direct URL) |
| `NEXTAUTH_SECRET` | run `openssl rand -base64 32` | Must be set or auth crashes |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `ADMIN_PASSWORD` | any strong string | Used once to create first admin |
| `ANT_KEY` | `sk-ant-...` | Anthropic API key for AI features |
| `NEXT_PUBLIC_WC_PROJECT_ID` | from cloud.walletconnect.com | MetaMask WalletConnect |
| `NEXT_PUBLIC_APP_DOMAIN` | `block67.app` | Or your Vercel preview domain |
| `NEXT_PUBLIC_BASE_RPC_URL` | `https://mainnet.base.org` | (public, free) |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/KEY` | For testnet deploys |

> Minimum required to boot: `DATABASE_URL`, `DATABASE_ANY_CLIENT`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

---

## 2. Database Setup (run once, from your local machine)

```bash
# Copy .env.example to .env.local and fill in real values
cp .env.example .env.local

# Push the schema to your database
npx prisma db push

# (Optional) Open Prisma Studio to inspect data
npx prisma studio
```

---

## 3. Create the First Admin (run once, after deployment)

```bash
curl -X POST https://YOUR_VERCEL_URL/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "your-admin-password",
    "adminSetupKey": "YOUR_ADMIN_PASSWORD_ENV_VALUE"
  }'
```

Response: `{ "message": "Admin created successfully.", "admin": { ... } }`

After this, sign in at `/login` with your admin email + password.

---

## 4. Subdomain Wildcard (optional, for `slug.block67.app`)

In your Vercel project:
1. Go to **Settings → Domains**
2. Add `*.block67.app` as a wildcard domain
3. Add the DNS records Vercel provides to your domain registrar

---

## 5. Neon Database — Two URLs Explained

Neon provides two connection strings:

```
# Pooled (use for DATABASE_URL — app runtime)
postgresql://user:pass@ep-name.region.aws.neon.tech/block67?pgbouncer=true&connection_limit=1

# Direct (use for DATABASE_ANY_CLIENT — prisma migrate/push)
postgresql://user:pass@ep-name.region.aws.neon.tech/block67
```

Both are in your Neon dashboard under **Connection Details**.

---

## 6. Quick Smoke Test

| URL | Expected |
|---|---|
| `/` | Landing page renders |
| `/login` | Login form with Email + MetaMask tabs |
| `/signup` | Signup form |
| `/dashboard` | Redirects to `/login` if not signed in |
| `/api/chains` | Returns `{ message: "TODO" }` (stub) |
