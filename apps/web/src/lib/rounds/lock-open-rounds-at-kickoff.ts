import { claimAndLockRound } from "@/lib/rounds/claim-lock-round";
import { firstKickoff } from "@/lib/rounds/first-kickoff";
import { prisma } from "@tiki-acca/database";

export type LockAtKickoffResult = {
  locked: string[];
  skipped: { roundId: string; reason: string }[];
};

/** Lock open rounds whose earliest submitted leg has kicked off (partial accas allowed). */
export async function lockOpenRoundsAtKickoff(
  now: Date = new Date()
): Promise<LockAtKickoffResult> {
  const rounds = await prisma.round.findMany({
    where: { status: "open", legs: { some: {} } },
    include: { legs: true },
  });

  const locked: string[] = [];
  const skipped: { roundId: string; reason: string }[] = [];

  for (const round of rounds) {
    const cutoff = firstKickoff(round.legs);
    if (!cutoff || cutoff > now) continue;

    try {
      const result = await claimAndLockRound(round.id);
      if (result.ok) {
        locked.push(round.id);
      } else {
        skipped.push({ roundId: round.id, reason: result.reason });
      }
    } catch (err) {
      console.error("[rounds] kickoff lock failed", round.id, err);
      skipped.push({ roundId: round.id, reason: "reprice_failed" });
    }
  }

  return { locked, skipped };
}
