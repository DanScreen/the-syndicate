import {
  EMAIL_COLORS,
  escapeHtml,
  highlightChip,
  mutedNote,
  notificationSettingsUrl,
  paragraph,
  renderEmailLayout,
  renderLegList,
  type EmailDocument,
} from "@/lib/notifications/email-layout";

export function formatNotificationDeadline(date: Date): string {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

export type LockedEmailLeg = {
  memberName: string;
  selectionLabel: string;
  marketLabel: string;
  odds: number;
};

export type SettledEmailLeg = {
  memberName: string;
  selectionLabel: string;
  outcome: "won" | "lost" | "void" | "pending";
  pointsLabel: string;
};

function plainTextFooter(): string {
  return [
    "",
    "We're not a bookmaker — we keep the score. You place bets with licensed UK operators. 18+. GambleAware: https://www.gambleaware.org/",
    `Manage preferences: ${notificationSettingsUrl()}`,
  ].join("\n");
}

export function pickReminderEmail(params: {
  groupName: string;
  deadline: Date;
  pendingCount: number;
  groupUrl: string;
}): EmailDocument {
  const time = formatNotificationDeadline(params.deadline);
  const waiting =
    params.pendingCount > 1
      ? `${params.pendingCount} of you still need a pick.`
      : "You're the last one out.";

  const bodyHtml = [
    paragraph(
      `First kickoff locks the acca at <strong style="color:${EMAIL_COLORS.foreground};">${escapeHtml(time)}</strong> — and your leg is still missing.`
    ),
    paragraph(escapeHtml(waiting)),
    mutedNote("Pull your weight before the deadline. Every leg counts."),
  ].join("");

  const text = [
    `${params.groupName} — pick your leg`,
    "",
    `Your group acca locks at ${time} when the first match kicks off.`,
    waiting,
    "",
    `Submit your pick: ${params.groupUrl}`,
    plainTextFooter(),
  ].join("\n");

  return {
    subject: `${params.groupName}: pick your leg before ${time}`,
    preheader: `Locks at ${time}. ${waiting}`,
    html: renderEmailLayout({
      preheader: `Locks at ${time}. ${waiting}`,
      eyebrow: params.groupName,
      title: "Your leg is still out",
      bodyHtml,
      ctaLabel: "Submit your pick",
      ctaUrl: params.groupUrl,
    }),
    text,
  };
}

export function roundLockedEmail(params: {
  groupName: string;
  combinedOdds: string;
  legs: LockedEmailLeg[];
  missingCount: number;
  groupUrl: string;
}): EmailDocument {
  const legList = renderLegList(
    params.legs.map((leg) => ({
      primary: escapeHtml(leg.memberName),
      secondary: `${escapeHtml(leg.selectionLabel)} · ${escapeHtml(leg.marketLabel)} @ ${leg.odds.toFixed(2)}`,
      badge: leg.odds.toFixed(2),
      badgeTone: "neutral" as const,
    }))
  );

  const everyoneIn =
    params.missingCount === 0
      ? "Everyone's in. The acca is locked and ready to place."
      : "Everyone's in — well, everyone who made it. The acca is locked and ready to place.";

  const partialNote =
    params.missingCount > 0
      ? mutedNote(
          `${params.missingCount} member${params.missingCount === 1 ? "" : "s"} missed kickoff and ${params.missingCount === 1 ? "isn't" : "aren't"} in this acca.`
        )
      : "";

  const bodyHtml = [
    paragraph(everyoneIn),
    paragraph(`Combined odds ${highlightChip(`@ ${params.combinedOdds}`)}`),
    legList,
    partialNote,
    mutedNote("Open the recommended bookmaker from the round page, then sweat it out together."),
  ].join("");

  const textLegs = params.legs
    .map(
      (leg) =>
        `- ${leg.memberName}: ${leg.selectionLabel} (${leg.marketLabel}) @ ${leg.odds.toFixed(2)}`
    )
    .join("\n");

  const textPartial =
    params.missingCount > 0
      ? `\n${params.missingCount} member${params.missingCount === 1 ? "" : "s"} missed kickoff and ${params.missingCount === 1 ? "isn't" : "aren't"} in this acca.\n`
      : "";

  const text = [
    `${params.groupName} — acca locked`,
    "",
    everyoneIn,
    `Combined odds: ${params.combinedOdds}`,
    "",
    textLegs,
    textPartial,
    `View acca: ${params.groupUrl}`,
    plainTextFooter(),
  ].join("\n");

  return {
    subject: `${params.groupName}: acca locked @ ${params.combinedOdds}`,
    preheader: `Combined @ ${params.combinedOdds} — ready to place.`,
    html: renderEmailLayout({
      preheader: `Combined @ ${params.combinedOdds} — ready to place.`,
      eyebrow: params.groupName,
      title: "Acca locked. Time to place it.",
      bodyHtml,
      ctaLabel: "View locked acca",
      ctaUrl: params.groupUrl,
    }),
    text,
  };
}

function outcomeBadge(outcome: SettledEmailLeg["outcome"]): {
  label: string;
  tone: "won" | "lost" | "void" | "neutral";
} {
  if (outcome === "won") return { label: "Won", tone: "won" };
  if (outcome === "lost") return { label: "Lost", tone: "lost" };
  if (outcome === "void") return { label: "Void", tone: "void" };
  return { label: "Pending", tone: "neutral" };
}

export function roundSettledEmail(params: {
  groupName: string;
  plLabel: string;
  wonCount: number;
  lostCount: number;
  legs: SettledEmailLeg[];
  groupUrl: string;
}): EmailDocument {
  const record = `${params.wonCount}W · ${params.lostCount}L`;
  const wonAll = params.lostCount === 0 && params.wonCount > 0;
  const title = wonAll
    ? "Every leg landed."
    : params.wonCount === 0
      ? "The acca's down."
      : "Settled — receipts are in.";

  const lead = wonAll
    ? "Clean sheet. The scoreboard's going to look good."
    : params.wonCount === 0
      ? "Someone's catching banter in the group chat. Here's the proof."
      : "Part win, part pain — see who delivered and who let the side down.";

  const legList = renderLegList(
    params.legs.map((leg) => {
      const badge = outcomeBadge(leg.outcome);
      return {
        primary: escapeHtml(leg.memberName),
        secondary: `${escapeHtml(leg.selectionLabel)} · ${escapeHtml(leg.pointsLabel)} pts`,
        badge: badge.label,
        badgeTone: badge.tone,
      };
    })
  );

  const bodyHtml = [
    paragraph(escapeHtml(lead)),
    paragraph(`Result ${highlightChip(record)}`),
    legList,
    mutedNote(
      `Unit-stake P/L at £10: <strong style="color:${EMAIL_COLORS.foreground};">${escapeHtml(params.plLabel)}</strong> — convert points to whatever stake your group runs.`
    ),
  ].join("");

  const textLegs = params.legs
    .map((leg) => {
      const badge = outcomeBadge(leg.outcome).label;
      return `- [${badge}] ${leg.memberName}: ${leg.selectionLabel} (${leg.pointsLabel} pts)`;
    })
    .join("\n");

  const text = [
    `${params.groupName} — round settled`,
    "",
    lead,
    `Result: ${record}`,
    `Unit-stake P/L (£10): ${params.plLabel}`,
    "",
    textLegs,
    "",
    `View stats: ${params.groupUrl}`,
    plainTextFooter(),
  ].join("\n");

  return {
    subject: `${params.groupName}: settled — ${params.wonCount}W ${params.lostCount}L`,
    preheader: `${lead} ${record}.`,
    html: renderEmailLayout({
      preheader: `${lead} ${record}.`,
      eyebrow: params.groupName,
      title,
      bodyHtml,
      ctaLabel: "See the leaderboard",
      ctaUrl: params.groupUrl,
    }),
    text,
  };
}

export function pickReminderPush(params: {
  groupName: string;
  deadline: Date;
}): { title: string; body: string } {
  const time = formatNotificationDeadline(params.deadline);
  return {
    title: `${params.groupName}: pick your leg`,
    body: `Locks at ${time}. Every leg counts.`,
  };
}

export function roundLockedPush(groupName: string): { title: string; body: string } {
  return {
    title: `${groupName}: acca locked`,
    body: "Ready to place — open Tiki Acca for the best bookmaker.",
  };
}

export function roundSettledPush(params: {
  groupName: string;
  wonCount: number;
  lostCount: number;
}): { title: string; body: string } {
  return {
    title: `${params.groupName}: settled`,
    body: `${params.wonCount}W ${params.lostCount}L — see who delivered.`,
  };
}
