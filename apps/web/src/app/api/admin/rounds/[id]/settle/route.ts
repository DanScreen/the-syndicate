import { requireAdmin } from "@/lib/admin";
import {
  applyRoundSettlement,
  RoundNotSettleableError,
} from "@/lib/settlement/apply-round-settlement";
import { prisma } from "@the-syndicate/database";
import { adminSettleRoundSchema } from "@the-syndicate/shared";
import type { LegOutcome } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * Platform-admin manual settlement — the escape hatch for rounds the system
 * cannot resolve (unrecognised market, missing match data). Group owners have
 * no settlement powers; this is admin-only by design.
 */
export async function POST(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: roundId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = adminSettleRoundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { legs: { select: { id: true } } },
  });

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  if (round.status !== "locked") {
    return NextResponse.json({ error: "Round is not locked" }, { status: 400 });
  }

  const outcomeMap = new Map<string, LegOutcome>(
    parsed.data.legOutcomes.map((o) => [o.legId, o.outcome])
  );

  // Outcomes must cover exactly the round's legs — no unknown ids, no
  // duplicates, none missing — so nothing silently defaults to "lost".
  const roundLegIds = new Set(round.legs.map((l) => l.id));
  const unknownLegIds = parsed.data.legOutcomes
    .map((o) => o.legId)
    .filter((id) => !roundLegIds.has(id));
  const missingLegIds = round.legs
    .map((l) => l.id)
    .filter((id) => !outcomeMap.has(id));

  if (
    unknownLegIds.length > 0 ||
    missingLegIds.length > 0 ||
    outcomeMap.size !== parsed.data.legOutcomes.length
  ) {
    return NextResponse.json(
      {
        error: "Provide exactly one outcome for each leg in the round",
        unknownLegIds,
        missingLegIds,
      },
      { status: 400 }
    );
  }

  try {
    const result = await applyRoundSettlement(roundId, outcomeMap);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof RoundNotSettleableError) {
      return NextResponse.json(
        { error: "Round has already been settled" },
        { status: 409 }
      );
    }
    throw err;
  }
}
