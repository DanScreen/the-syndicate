import { requireSession } from "@/lib/api-auth";
import { prisma } from "@tiki-acca/database";
import { NextResponse } from "next/server";

/** List members this user has blocked — powers the unblock UI. */
export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: session!.user!.id },
    include: { blocked: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    blocks: blocks.map((b) => ({ userId: b.blocked.id, name: b.blocked.name })),
  });
}
