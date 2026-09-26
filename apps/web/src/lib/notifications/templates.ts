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
  marketLabel: string;
  outcome: "won" | "lost" | "void" | "pending";
  pointsLabel: string;
};

function plainTextFooter(): string {
  return [
    "",
    "We're not a bookmaker. We keep the score. You place bets with licensed UK operators. 18+. GambleAware: https://www.gambleaware.org/",
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
      `First kickoff locks the acca at <strong style="color:${EMAIL_COLORS.foreground};">${escapeHtml(time)}</strong>, and your leg is still missing.`
    ),
    paragraph(escapeHtml(waiting)),
    mutedNote("Pull your weight before the deadline. Every Leg Counts."),
  ].join("");

  const text = [
    `${params.groupName}: Pick Your Leg`,
    "",
    `Your group acca locks at ${time} when the first match kicks off.`,
    waiting,
    "",
    `Submit your pick: ${params.groupUrl}`,
    plainTextFooter(),
  ].join("\n");

  return {
    subject: `${params.groupName}: Pick Your Leg Before ${time}`,
    preheader: `Locks at ${time}. ${waiting}`,
    html: renderEmailLayout({
      preheader: `Locks at ${time}. ${waiting}`,
      eyebrow: params.groupName,
      title: "You Still Need To Pick A Leg",
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
      : "Everyone's in. Well, everyone who made it. The acca is locked and ready to place.";

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
    `${params.groupName}: Acca Locked`,
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
    subject: `${params.groupName}: Acca Locked @ ${params.combinedOdds}`,
    preheader: `Combined @ ${params.combinedOdds}. Ready to place.`,
    html: renderEmailLayout({
      preheader: `Combined @ ${params.combinedOdds}. Ready to place.`,
      eyebrow: params.groupName,
      title: "Acca Locked. Time To Place It.",
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
    ? "Every Leg Landed."
    : params.wonCount === 0
      ? "The Acca's Down."
      : "Settled. Receipts Are In.";

  const lead = wonAll
    ? "Clean sheet. The scoreboard's going to look good."
    : params.wonCount === 0
      ? "Someone's catching banter in the group chat. Here's the proof."
      : "Part win, part pain. See who delivered and who let the side down.";

  const legList = renderLegList(
    params.legs.map((leg) => {
      const badge = outcomeBadge(leg.outcome);
      return {
        primary: escapeHtml(leg.memberName),
        secondary: `${escapeHtml(leg.selectionLabel)} · ${escapeHtml(leg.marketLabel)} · ${escapeHtml(leg.pointsLabel)} pts`,
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
      `Unit-stake P/L at £10: <strong style="color:${EMAIL_COLORS.foreground};">${escapeHtml(params.plLabel)}</strong>. Convert points to whatever stake your group runs.`
    ),
  ].join("");

  const textLegs = params.legs
    .map((leg) => {
      const badge = outcomeBadge(leg.outcome).label;
      return `- [${badge}] ${leg.memberName}: ${leg.selectionLabel} (${leg.marketLabel}) (${leg.pointsLabel} pts)`;
    })
    .join("\n");

  const text = [
    `${params.groupName}: Round Settled`,
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
    subject: `${params.groupName}: Settled (${params.wonCount}W ${params.lostCount}L)`,
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
    title: `${params.groupName}: Pick Your Leg`,
    body: `Locks at ${time}. Every Leg Counts.`,
  };
}

export function roundLockedPush(groupName: string): { title: string; body: string } {
  return {
    title: `${groupName}: Acca Locked`,
    body: "Ready to place. Open Tiki Acca for the best bookmaker.",
  };
}

export function roundSettledPush(params: {
  groupName: string;
  wonCount: number;
  lostCount: number;
}): { title: string; body: string } {
  return {
    title: `${params.groupName}: Settled`,
    body: `${params.wonCount}W ${params.lostCount}L. See who delivered.`,
  };
}

/**
 * `reopened`: the locked acca reopened for the swap. `open`: the acca hadn't
 * locked yet. `closed`: the other matches have kicked off, too late to swap.
 */
export type PickVoidedSwap = "reopened" | "open" | "closed";

export type PickVoidedParams = {
  groupName: string;
  /** "Leeds v Hull" */
  fixture: string;
  selectionLabel: string;
  swap: PickVoidedSwap;
  /** Swap deadline (first remaining kickoff); null when there is none. */
  deadline: Date | null;
  /** Acca odds without the void pick, when known. */
  oddsWithout: number | null;
  groupUrl: string;
};

function pickVoidedCopy(params: Omit<PickVoidedParams, "groupUrl">) {
  const time =
    params.swap !== "closed" && params.deadline
      ? formatNotificationDeadline(params.deadline)
      : null;
  const odds = params.oddsWithout != null ? params.oddsWithout.toFixed(2) : null;
  const canSwap = params.swap !== "closed";
  const lead = `${params.fixture} has been postponed or cancelled, so your pick (${params.selectionLabel}) is void.`;
  const opener =
    params.swap === "reopened" ? "The acca has reopened so you can swap it." : "You can swap it for another pick.";
  const next = !canSwap
    ? "The other matches have already kicked off, so it can't be swapped."
    : time
      ? `${opener} Pick a replacement before ${time}, when the first remaining match kicks off and the acca locks.`
      : opener;
  const fallback = !canSwap
    ? `The acca carries on without it${odds ? ` at ${odds}` : ""}, as it would at the bookmaker.`
    : `If you don't, the acca goes ahead without it${odds ? ` at ${odds}` : ""}.`;
  return { time, canSwap, lead, opener, next, fallback };
}

export function pickVoidedEmail(params: PickVoidedParams): EmailDocument {
  const { time, canSwap, lead, opener, next, fallback } = pickVoidedCopy(params);

  const bodyHtml = [
    paragraph(escapeHtml(lead)),
    paragraph(
      canSwap && time
        ? `${escapeHtml(opener)} Pick a replacement before <strong style="color:${EMAIL_COLORS.foreground};">${escapeHtml(time)}</strong>, when the first remaining match kicks off and the acca locks.`
        : escapeHtml(next)
    ),
    mutedNote(escapeHtml(fallback)),
  ].join("");

  const title = canSwap ? "Your Pick Is Void. Swap It." : "Your Pick Is Void";
  const preheader = time ? `Swap it before ${time}.` : canSwap ? "Swap it for another pick." : fallback;
  const ctaLabel = canSwap ? "Swap your pick" : "See the acca";
  const text = [
    `${params.groupName}: ${title}`,
    "",
    lead,
    next,
    fallback,
    "",
    `${ctaLabel}: ${params.groupUrl}`,
    plainTextFooter(),
  ].join("\n");

  return {
    subject: `${params.groupName}: ${title}`,
    preheader,
    html: renderEmailLayout({
      preheader,
      eyebrow: params.groupName,
      title,
      bodyHtml,
      ctaLabel,
      ctaUrl: params.groupUrl,
    }),
    text,
  };
}

export function pickVoidedPush(
  params: Omit<PickVoidedParams, "groupUrl" | "selectionLabel">
): { title: string; body: string } {
  const { time, canSwap } = pickVoidedCopy({ ...params, selectionLabel: "" });
  const odds = params.oddsWithout != null ? ` at ${params.oddsWithout.toFixed(2)}` : "";
  return {
    title: `${params.groupName}: Your Pick Is Void`,
    body: !canSwap
      ? `${params.fixture} is off. The acca carries on without it${odds}.`
      : time
        ? `${params.fixture} is off. Swap your pick before ${time}.`
        : `${params.fixture} is off. Swap your pick for another one.`,
  };
}
