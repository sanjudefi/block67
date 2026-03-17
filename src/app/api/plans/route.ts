// GET /api/plans — returns active plans from DB (seeds defaults if empty)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db/index";
import { PAYMENT_ADDRESS, PREMIUM_PLAN, FREE_PLAN } from "@/lib/upgrade/plans";

const DEFAULT_PLANS = [
  {
    slug:                  FREE_PLAN.slug,
    name:                  FREE_PLAN.name,
    priceMonthly:          FREE_PLAN.priceMonthly,
    totalPrice:            FREE_PLAN.totalPrice,
    billingNote:           null,
    projectLimit:          FREE_PLAN.projectLimit,
    domainLimit:           FREE_PLAN.domainLimit,
    frontendChangesPerDay: FREE_PLAN.frontendChangesPerDay,
    contractChangesPerDay: FREE_PLAN.contractChangesPerDay,
    paymentAddress:        null,
    paymentAmountEth:      null,
    testnetsEnabled:       false,
    isActive:              true,
    sortOrder:             0,
    features:              ["3 projects", "block67.app subdomain", "10 frontend changes/day", "2 contract changes/day"],
  },
  {
    slug:                  PREMIUM_PLAN.slug,
    name:                  PREMIUM_PLAN.name,
    priceMonthly:          PREMIUM_PLAN.priceMonthly,
    totalPrice:            PREMIUM_PLAN.totalPrice,
    billingNote:           PREMIUM_PLAN.billingNote,
    projectLimit:          PREMIUM_PLAN.projectLimit,
    domainLimit:           PREMIUM_PLAN.domainLimit,
    frontendChangesPerDay: PREMIUM_PLAN.frontendChangesPerDay,
    contractChangesPerDay: PREMIUM_PLAN.contractChangesPerDay,
    paymentAddress:        PAYMENT_ADDRESS,
    paymentAmountEth:      PREMIUM_PLAN.eth,
    testnetsEnabled:       false,
    isActive:              true,
    sortOrder:             1,
    features:              [...PREMIUM_PLAN.features],
  },
  {
    slug:                  "enterprise",
    name:                  "Enterprise",
    priceMonthly:          199,
    totalPrice:            199,
    billingNote:           "Billed monthly",
    projectLimit:          99,
    domainLimit:           99,
    frontendChangesPerDay: 9999,
    contractChangesPerDay: 9999,
    paymentAddress:        PAYMENT_ADDRESS,
    paymentAmountEth:      "0.067",
    testnetsEnabled:       false,
    isActive:              true,
    sortOrder:             2,
    features:              [
      "Unlimited projects",
      "Unlimited custom domains",
      "Unlimited AI changes",
      "Dedicated support",
      "Continuous development help from our team",
    ],
  },
];

export async function GET() {
  try {
    let plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });

    // Auto-seed defaults if table is empty
    if (plans.length === 0) {
      await prisma.plan.createMany({ data: DEFAULT_PLANS as never[], skipDuplicates: true });
      plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    }

    return NextResponse.json({ plans: plans.map(serialize) });
  } catch {
    // DB unavailable — return hardcoded defaults
    return NextResponse.json({ plans: DEFAULT_PLANS.map(p => ({ ...p, id: p.slug, updatedAt: null, createdAt: null })) });
  }
}

function serialize(p: Record<string, unknown>) {
  return {
    ...p,
    priceMonthly: Number(p.priceMonthly),
    totalPrice:   Number(p.totalPrice),
    features:     Array.isArray(p.features) ? p.features : [],
  };
}
