import type { Prisma, PrismaClient } from "@prisma/client";
import { accaSucceeded, groupAccaRoundPoints, type LegOutcome } from "@tiki-acca/shared";

/**
 * System-message writers for the round chat thread (specs/group-chat.md).
 *
 * Exactly-once contract: every caller must gate the write on the atomic claim
 * that makes its lifecycle event happen at most once — the `locked → settled`
 * round claim, the `open → locked` round claim, or a `pending → outcome` leg
 * claim — and, where the claim runs inside a transaction, pass that
 * transaction client here so the message commits or rolls back with it.
 */
type Db = PrismaClient | Prisma.TransactionClient;

type AnnouncedLeg = {
  id: string;
  roundId: string;
  userId: string;
  homeTeam: string;
  awayTeam: string;
  selectionLabel: string;
  odds: number;
};

function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

async function displayName(db: Db, userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  return user?.name ?? "Someone";
}

async function createSystemMessage(
  db: Db,
  data: {
    roundId: string;
    eventType: string;
    body: string;
    legId?: string;
    createdAt?: Date;
  }
): Promise<void> {
  await db.roundMessage.create({
    data: {
      roundId: data.roundId,
      kind: "system",
      eventType: data.eventType,
      body: data.body,
      legId: data.legId,
      ...(data.createdAt ? { createdAt: data.createdAt } : {}),
    },
  });
}

export function formatLegSubmittedBody(
  name: string,
  leg: Pick<AnnouncedLeg, "selectionLabel" | "homeTeam" | "awayTeam" | "odds">
): string {
  return `${name} locked in ${leg.selectionLabel} (${leg.homeTeam} v ${leg.awayTeam}) @ ${formatOdds(leg.odds)} 🔒`;
}

/** "Dan locked in BTTS (Spain v France) @ 1.80 🔒" */
export async function postLegSubmittedMessage(
  db: Db,
  leg: AnnouncedLeg,
  userName?: string,
  options?: { createdAt?: Date }
): Promise<void> {
  const name = userName ?? (await displayName(db, leg.userId));
  await createSystemMessage(db, {
    roundId: leg.roundId,
    eventType: "leg_submitted",
    legId: leg.id,
    body: formatLegSubmittedBody(name, leg),
    createdAt: options?.createdAt,
  });
}

/** Pick edits post a fresh announcement; reactions stay with the old message. */
export async function postLegChangedMessage(
  db: Db,
  leg: AnnouncedLeg,
  userName?: string
): Promise<void> {
  const name = userName ?? (await displayName(db, leg.userId));
  await createSystemMessage(db, {
    roundId: leg.roundId,
    eventType: "leg_changed",
    legId: leg.id,
    body: `${name} changed their pick to ${leg.selectionLabel} (${leg.homeTeam} v ${leg.awayTeam}) @ ${formatOdds(leg.odds)} ✏️`,
  });
}

export function formatLegRemovedBody(
  name: string,
  leg: Pick<AnnouncedLeg, "selectionLabel" | "homeTeam" | "awayTeam">
): string {
  return `${name} removed ${leg.selectionLabel} (${leg.homeTeam} v ${leg.awayTeam}) from the acca 🗑️`;
}

/** Removal messages preserve the event after the deleted leg relation is gone. */
export async function postLegRemovedMessage(
  db: Db,
  leg: AnnouncedLeg,
  userName?: string
): Promise<void> {
  const name = userName ?? (await displayName(db, leg.userId));
  await createSystemMessage(db, {
    roundId: leg.roundId,
    eventType: "leg_removed",
    body: formatLegRemovedBody(name, leg),
  });
}

/** Posted by the winner of the `open → locked` claim, after pricing succeeds. */
export async function postRoundLockedMessage(db: Db, roundId: string): Promise<void> {
  const round = await db.round.findUnique({
    where: { id: roundId },
    select: { combinedOdds: true, _count: { select: { legs: true } } },
  });
  if (!round) return;
  const legCount = round._count.legs;
  const legsPart = `${legCount} ${legCount === 1 ? "leg" : "legs"}`;
  const oddsPart = round.combinedOdds ? ` @ ${formatOdds(round.combinedOdds)}` : "";
  await createSystemMessage(db, {
    roundId,
    eventType: "round_locked",
    body: `Acca locked. ${legsPart}${oddsPart}. Good luck! 🔐`,
  });
}

/** Posted by the winner of a `pending → outcome` leg claim. */
export async function postLegResultMessage(
  db: Db,
  leg: AnnouncedLeg,
  outcome: Exclude<LegOutcome, "pending">,
  userName?: string
): Promise<void> {
  const name = userName ?? (await displayName(db, leg.userId));
  const verdict =
    outcome === "won" ? "won ✅" : outcome === "lost" ? "lost ❌" : "was voided ⚪️";
  await createSystemMessage(db, {
    roundId: leg.roundId,
    eventType: "leg_result",
    legId: leg.id,
    body: `${name}'s ${leg.selectionLabel} (${leg.homeTeam} v ${leg.awayTeam}) ${verdict}`,
  });
}

/** Posted inside the settle transaction, after the `locked → settled` claim. */
export async function postRoundSettledMessage(
  db: Db,
  roundId: string,
  outcomes: LegOutcome[],
  combinedOdds: number | null
): Promise<void> {
  const won = accaSucceeded(outcomes);
  const points = groupAccaRoundPoints(outcomes, combinedOdds ?? 1);
  const body = won
    ? `Acca won! +${points} group pts 🎉`
    : `Acca lost. ${points} group pt. On to the next one 💀`;
  await createSystemMessage(db, { roundId, eventType: "round_settled", body });
}

/**
 * Best-effort wrapper for writes outside a lifecycle transaction (leg
 * submit/edit announcements, round locked): the event has already happened,
 * so a failed chat write logs rather than failing the request.
 */
export async function tryPostSystemMessage(
  label: string,
  write: () => Promise<void>
): Promise<void> {
  try {
    await write();
  } catch (err) {
    console.error(`[chat] ${label} system message failed`, err);
  }
}
