import { requireAdmin } from "@/lib/admin";
import { deleteRedundantMarketLegs } from "@/lib/legs/purge-duplicate-markets";
import {
  applyDeferredLegOutcome,
  applyRoundSettlement,
  RoundNotSettleableError,
} from "@/lib/settlement/apply-round-settlement";
import { prisma } from "@tiki-acca/database";
import { adminSettleRoundSchema } from "@tiki-acca/shared";
import type { LegOutcome } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * Platform-admin manual settlement — the escape hatch for rounds the system
 * cannot resolve (unrecognised market, missing match data). Group owners have
 * no settlement powers; this is admin-only by design.
 *
 * Also resolves remaining pending legs on rounds that already settled early
 * after a loss.
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

  // Drop legacy duplicate market-family legs before validating outcomes.
  await deleteRedundantMarketLegs(roundId);

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { legs: { select: { id: true, outcome: true } } },
  });

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const remainingIds = new Set(round.legs.map((l) => l.id));
  const outcomeMap = new Map<string, LegOutcome>(
    parsed.data.legOutcomes
      .filter((o) => remainingIds.has(o.legId))
      .map((o) => [o.legId, o.outcome])
  );

  if (round.status === "settled") {
    const pendingLegs = round.legs.filter((l) => l.outcome === "pending");
    if (pendingLegs.length === 0) {
      return NextResponse.json(
        { error: "Round is already fully settled" },
        { status: 400 }
      );
    }

    const pendingIds = new Set(pendingLegs.map((l) => l.id));
    const unknownLegIds = [...outcomeMap.keys()].filter((id) => !pendingIds.has(id));
    const missingLegIds = pendingLegs
      .map((l) => l.id)
      .filter((id) => !outcomeMap.has(id));

    if (unknownLegIds.length > 0 || missingLegIds.length > 0) {
      return NextResponse.json(
        {
          error: "Provide exactly one outcome for each remaining pending leg",
          unknownLegIds,
          missingLegIds,
        },
        { status: 400 }
      );
    }

    const awarded = [];
    for (const [legId, outcome] of outcomeMap) {
      const result = await applyDeferredLegOutcome(roundId, legId, outcome);
      if (result.awarded) {
        awarded.push({ legId, outcome, points: result.points });
      }
    }

    return NextResponse.json({ status: "settled", deferred: awarded });
  }

  if (round.status !== "locked") {
    return NextResponse.json({ error: "Round is not locked" }, { status: 400 });
  }

  // Outcomes must cover exactly the round's remaining legs after duplicate purge.
  const missingLegIds = round.legs
    .map((l) => l.id)
    .filter((id) => !outcomeMap.has(id));

  if (missingLegIds.length > 0 || outcomeMap.size !== round.legs.length) {
    return NextResponse.json(
      {
        error: "Provide exactly one outcome for each leg in the round",
        unknownLegIds: [],
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
