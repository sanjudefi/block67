// POST /api/projects/[id]/publish
// Snapshots the current draft (paramValues) into _publishedSnapshot inside
// paramValues, and sets project status = ACTIVE.
// The live site reads _publishedSnapshot; the editor always reads paramValues.
// This gives a clean Webflow-style draft → publish separation with NO schema change.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db as prisma } from "@/lib/db/index";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({
    where: { id: params.id, ownerId: session.user.id },
    select: { id: true, slug: true, paramValues: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Take the current draft config, strip any old snapshot key, then embed
  // the clean draft as the new published snapshot.
  const draft = (project.paramValues ?? {}) as Record<string, unknown>;
  const { _publishedSnapshot: _old, ...cleanDraft } = draft;

  const newParamValues = {
    ...cleanDraft,
    // Store the published snapshot as a JSON string inside paramValues.
    // The live site will JSON.parse this to get the published config.
    _publishedSnapshot: JSON.stringify(cleanDraft),
  };

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      paramValues: newParamValues,
      status: "ACTIVE",
    },
    select: { id: true, slug: true, status: true },
  });

  return NextResponse.json({ ok: true, project: updated });
}
