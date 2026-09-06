import { requireAdmin } from "@/lib/admin";
import { correctLegOutcome } from "@/lib/settlement/correct-leg-outcome";
import { tryAutoSettleRound } from "@/lib/settlement/auto-settle-round";
import { propagateSelectionOutcomes } from "@/lib/settlement/propagate-selection-outcome";
import { prisma } from "@tiki-acca/database";
import { adminCorrectLegOutcomeSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * Platform-admin correction of a wrong leg outcome (including already-settled
 * rounds). Adjusts points and posts a chat correction message.
 */
export async function POST(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: legId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = adminCorrectLegOutcomeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const leg = await prisma.leg.findUnique({
    where: { id: legId },
    select: {
      id: true,
      fixtureId: true,
      marketType: true,
      selectionId: true,
      roundId: true,
    },
  });
  if (!leg) {
    return NextResponse.json({ error: "Leg not found" }, { status: 404 });
  }

  try {
    const result = await correctLegOutcome(legId, parsed.data.outcome);

    // Propagate to other pending legs on the same selection (not already-
    // resolved ones — those need their own explicit correction).
    const { legsUpdated, affectedRoundIds } = await propagateSelectionOutcomes([
      {
        legId: leg.id,
        fixtureId: leg.fixtureId,
        marketType: leg.marketType,
        selectionId: leg.selectionId,
        outcome: parsed.data.outcome,
      },
    ]);

    let roundsSettled = 0;
    const roundIds = new Set([result.roundId, ...affectedRoundIds]);
    for (const roundId of roundIds) {
      const settle = await tryAutoSettleRound(roundId);
      if (settle.status === "settled") roundsSettled += 1;
    }

    return NextResponse.json({
      ...result,
      propagatedLegs: legsUpdated,
      roundsSettled,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Correction failed";
    const status = message.includes("not found")
      ? 404
      : message.includes("must be locked")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
