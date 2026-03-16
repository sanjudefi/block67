// GET  /api/projects  — list projects for the authenticated user
// POST /api/projects  — create a new project
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db as prisma } from "@/lib/db/index";
import { BUILTIN_TEMPLATES } from "@/lib/templates/index";
import type { TemplateId } from "@/lib/templates/index";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where:   { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, templateId, paramValues } = body as {
    name: string;
    templateId: string;
    paramValues: Record<string, string>;
  };

  if (!name?.trim() || !templateId) {
    return NextResponse.json({ error: "name and templateId are required" }, { status: 400 });
  }

  // Validate templateId is a known built-in template
  const builtinTemplate = BUILTIN_TEMPLATES.find((t) => t.id === templateId);
  if (!builtinTemplate) {
    return NextResponse.json({ error: "Invalid templateId" }, { status: 400 });
  }

  // Generate a unique slug from name — minimum 8 characters
  const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
  function randomChars(n: number) {
    let s = "";
    for (let i = 0; i < n; i++) s += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)];
    return s;
  }
  let baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // Pad to minimum 8 characters
  if (baseSlug.length < 8) {
    const pad = 8 - baseSlug.length;
    baseSlug = baseSlug.length > 0 ? `${baseSlug}-${randomChars(pad - 1)}` : randomChars(8);
  }
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const existing = await prisma.project.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${baseSlug}-${suffix++}`;
  }

  // Ensure a DB Template record exists for this built-in template
  let dbTemplate = await prisma.template.findUnique({ where: { slug: templateId } });
  if (!dbTemplate) {
    // Find or create system user for built-in templates
    let systemUser = await prisma.user.findFirst({ where: { email: "system@block67.app" } });
    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: { email: "system@block67.app", name: "block67 System", role: "ADMIN" },
      });
    }

    dbTemplate = await prisma.template.create({
      data: {
        name: builtinTemplate.name,
        slug: templateId,
        description: builtinTemplate.description,
        category: builtinTemplate.category as "TOKEN" | "NFT" | "DAO" | "LANDING_PAGE" | "DEFI" | "OTHER",
        status: "APPROVED",
        parameters: builtinTemplate.params as object,
        authorId: systemUser.id,
        isFeatured: true,
      },
    });
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      slug,
      ownerId: session.user.id,
      templateId: dbTemplate.id,
      paramValues: { ...builtinTemplate.defaultConfig, ...paramValues, _templateKey: templateId },
      status: "DRAFT",
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
