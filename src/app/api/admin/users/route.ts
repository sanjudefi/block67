// GET /api/admin/users — admin-only user list with activity data
export const dynamic = "force-dynamic";

import { NextResponse }      from "next/server";
import { cookies }           from "next/headers";
import { getToken }          from "next-auth/jwt";
import { db as prisma }      from "@/lib/db/index";

async function isAdmin() {
  try {
    const store = cookies();
    const token = await getToken({
      req:    { cookies: Object.fromEntries(store.getAll().map((c) => [c.name, c.value])) } as never,
      secret: process.env.NEXTAUTH_SECRET,
    });
    return (token?.role as string) === "ADMIN";
  } catch { return false; }
}

export async function GET() {
  if (!await isAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id:            true,
      name:          true,
      email:         true,
      walletAddress: true,
      role:          true,
      createdAt:     true,
      updatedAt:     true,
      projects: {
        orderBy: { updatedAt: "desc" },
        select: {
          id:        true,
          name:      true,
          slug:      true,
          status:    true,
          templateId:true,
          updatedAt: true,
          deployments: {
            orderBy: { createdAt: "desc" },
            take:    1,
            select: {
              contractAddress: true,
              status:          true,
              deployedAt:      true,
              chain:           { select: { name: true, networkType: true } },
            },
          },
        },
      },
    },
  });

  // Compute summary stats per user
  const enriched = users.map((u) => {
    const totalProjects    = u.projects.length;
    const deployedProjects = u.projects.filter((p) => p.deployments[0]?.status === "SUCCESS").length;
    const lastActive       = u.projects.reduce((best, p) => {
      const t = new Date(p.updatedAt).getTime();
      return t > best ? t : best;
    }, new Date(u.updatedAt).getTime());

    return {
      id:            u.id,
      name:          u.name,
      email:         u.email,
      walletAddress: u.walletAddress,
      role:          u.role,
      createdAt:     u.createdAt,
      lastActive:    new Date(lastActive),
      totalProjects,
      deployedProjects,
      recentProjects: u.projects.slice(0, 5).map((p) => ({
        id:         p.id,
        name:       p.name,
        slug:       p.slug,
        templateId: p.templateId,
        status:     p.status,
        updatedAt:  p.updatedAt,
        deployed:   p.deployments[0]?.status === "SUCCESS",
        chain:      p.deployments[0]?.chain?.name ?? null,
        networkType:p.deployments[0]?.chain?.networkType ?? null,
        deployedAt: p.deployments[0]?.deployedAt ?? null,
      })),
    };
  });

  return NextResponse.json({ users: enriched, total: enriched.length });
}
