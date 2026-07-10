import { appBaseUrl, sendEmail } from "@/lib/notifications/email";
import { prisma } from "@the-syndicate/database";
import { formatLegPoints } from "@the-syndicate/shared";

async function memberEmails(groupId: string): Promise<string[]> {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { email: true } } },
  });
  return members.map((m) => m.user.email);
}

export async function notifyRoundLocked(roundId: string): Promise<void> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      legs: { include: { user: { select: { name: true } } } },
      group: { select: { id: true, name: true } },
    },
  });

  if (!round || round.status !== "locked") return;
  if (round.lockedNotificationSentAt) return;

  const emails = await memberEmails(round.groupId);
  const url = `${appBaseUrl()}/groups/${round.group.id}`;
  const odds = round.combinedOdds?.toFixed(2) ?? "—";

  const legLines = round.legs
    .map(
      (leg) =>
        `<li><strong>${leg.user.name}</strong>: ${leg.selectionLabel} (${leg.marketLabel}) @ ${leg.odds.toFixed(2)}</li>`
    )
    .join("");

  const sent = await sendEmail({
    to: emails,
    subject: `${round.group.name} — acca locked`,
    html: `
      <p>Your syndicate acca is locked and ready to place.</p>
      <p><strong>Combined odds:</strong> ${odds}</p>
      <ul>${legLines}</ul>
      <p><a href="${url}">View acca on The Syndicate</a></p>
    `,
  });

  if (sent) {
    await prisma.round.update({
      where: { id: roundId },
      data: { lockedNotificationSentAt: new Date() },
    });
  }
}

export async function notifyRoundSettled(roundId: string): Promise<void> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      legs: { include: { user: { select: { name: true } } } },
      group: { select: { id: true, name: true } },
    },
  });

  if (!round || round.status !== "settled") return;
  if (round.settledNotificationSentAt) return;

  const emails = await memberEmails(round.groupId);
  const url = `${appBaseUrl()}/groups/${round.group.id}`;

  const wonCount = round.legs.filter((l) => l.outcome === "won").length;
  const lostCount = round.legs.filter((l) => l.outcome === "lost").length;
  const pl = round.profitLossGbp ?? 0;
  const plLabel = pl >= 0 ? `+£${pl.toFixed(2)}` : `−£${Math.abs(pl).toFixed(2)}`;

  const legLines = round.legs
    .map((leg) => {
      const pts = formatLegPoints(leg.pointsAwarded);
      const outcome =
        leg.outcome === "won" ? "✓" : leg.outcome === "void" ? "—" : "✗";
      return `<li>${outcome} <strong>${leg.user.name}</strong>: ${leg.selectionLabel} (${pts} pts)</li>`;
    })
    .join("");

  const sent = await sendEmail({
    to: emails,
    subject: `${round.group.name} — round settled (${wonCount}W ${lostCount}L)`,
    html: `
      <p>Your syndicate round has been settled.</p>
      <p><strong>Acca P/L ( £10 stake ):</strong> ${plLabel}</p>
      <ul>${legLines}</ul>
      <p><a href="${url}">View stats on The Syndicate</a></p>
    `,
  });

  if (sent) {
    await prisma.round.update({
      where: { id: roundId },
      data: { settledNotificationSentAt: new Date() },
    });
  }
}
