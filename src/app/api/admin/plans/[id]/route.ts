// PATCH /api/admin/plans/[id] — update a plan
// DELETE /api/admin/plans/[id] — delete a plan
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Record<string, unknown>;
  const { id } = params;

  const plan = await prisma.plan.update({
    where: { id },
    data: {
      ...(body.name                  !== undefined && { name:                  body.name                  as string }),
      ...(body.priceMonthly          !== undefined && { priceMonthly:          body.priceMonthly          as number }),
      ...(body.totalPrice            !== undefined && { totalPrice:            body.totalPrice            as number }),
      ...(body.billingNote           !== undefined && { billingNote:           body.billingNote           as string }),
      ...(body.projectLimit          !== undefined && { projectLimit:          body.projectLimit          as number }),
      ...(body.domainLimit           !== undefined && { domainLimit:           body.domainLimit           as number }),
      ...(body.frontendChangesPerDay !== undefined && { frontendChangesPerDay: body.frontendChangesPerDay as number }),
      ...(body.contractChangesPerDay !== undefined && { contractChangesPerDay: body.contractChangesPerDay as number }),
      ...(body.paymentAddress        !== undefined && { paymentAddress:        body.paymentAddress        as string }),
      ...(body.paymentAmountEth      !== undefined && { paymentAmountEth:      body.paymentAmountEth      as string }),
      ...(body.testnetsEnabled       !== undefined && { testnetsEnabled:       body.testnetsEnabled       as boolean }),
      ...(body.isActive              !== undefined && { isActive:              body.isActive              as boolean }),
      ...(body.sortOrder             !== undefined && { sortOrder:             body.sortOrder             as number }),
      ...(body.features              !== undefined && { features:              body.features as string[] }),
    },
  });

  return NextResponse.json({ plan: { ...plan, priceMonthly: Number(plan.priceMonthly), totalPrice: Number(plan.totalPrice) } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.plan.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
