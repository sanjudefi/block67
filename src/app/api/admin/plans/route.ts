// Admin Plans API
// GET  /api/admin/plans — list all plans
// POST /api/admin/plans — create a plan
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db as prisma } from "@/lib/db/index";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return user?.role === "ADMIN" ? session : null;
}

function serialize(p: Record<string, unknown>) {
  return { ...p, priceMonthly: Number(p.priceMonthly), totalPrice: Number(p.totalPrice) };
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ plans: plans.map(serialize) });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    slug: string; name: string; priceMonthly: number; totalPrice: number;
    billingNote?: string; projectLimit: number; domainLimit: number;
    frontendChangesPerDay: number; contractChangesPerDay: number;
    paymentAddress?: string; paymentAmountEth?: string;
    testnetsEnabled?: boolean; isActive?: boolean; sortOrder?: number;
    features?: string[];
  };

  if (!body.slug || !body.name) {
    return NextResponse.json({ error: "slug and name are required" }, { status: 400 });
  }

  const plan = await prisma.plan.create({
    data: {
      slug:                  body.slug,
      name:                  body.name,
      priceMonthly:          body.priceMonthly ?? 0,
      totalPrice:            body.totalPrice   ?? 0,
      billingNote:           body.billingNote  ?? null,
      projectLimit:          body.projectLimit ?? 3,
      domainLimit:           body.domainLimit  ?? 0,
      frontendChangesPerDay: body.frontendChangesPerDay ?? 10,
      contractChangesPerDay: body.contractChangesPerDay ?? 2,
      paymentAddress:        body.paymentAddress   ?? null,
      paymentAmountEth:      body.paymentAmountEth ?? null,
      testnetsEnabled:       body.testnetsEnabled  ?? false,
      isActive:              body.isActive  ?? true,
      sortOrder:             body.sortOrder ?? 0,
      features:              body.features  ?? [],
    },
  });

  return NextResponse.json({ plan: serialize(plan as unknown as Record<string, unknown>) }, { status: 201 });
}
