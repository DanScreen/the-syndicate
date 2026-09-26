import type { AccaBookmakerRanking } from "./acca";
import type {
  ActiveRound,
  BetslipLinks,
  GroupDetailResponse,
  GroupLeg,
} from "./api-types";
import type { RoundMessageDto } from "./chat";
import { SOLO_MAX_LEGS } from "./constants";
import { formatFixtureLabel } from "./fixtures";
import { formatKickoff } from "./round-display";
import { effectiveAccaOdds, lockedPriceIncludesVoidLegs } from "./scoring";

/** Combined-odds card for the selected bet (`show` false when there is nothing to price). */
export type AccaSummaryView = {
  show: boolean;
  combinedOdds: number | null;
  bestBookmakerId: string | null;
  bookmakerName: string | null;
  rankings: AccaBookmakerRanking[];
  /** Betslip CTA: while open, and once locked until the first result lands. */
  betslipLink: string | null;
  betslipLinkQuality: "deeplink" | "hub" | null;
  betslipHasAllLegLinks: boolean;
  /** Collapse the bookmaker comparison once the bet is underway. */
  compareDefaultOpen: boolean;
  /** Legs in the acca — void picks drop out. */
  legCount: number;
};

/**
 * Everything the group Bet tab shows for the selected active bet, derived from
 * `GET /api/groups/[id]`. Web and mobile render this; neither re-derives it.
 */
export type RoundView = {
  /** Open/locked bets, newest open first (falls back to `activeRound`). */
  activeRounds: ActiveRound[];
  /** Selected bet, or the first active one. */
  round: ActiveRound | null;
  isOpen: boolean;
  isLocked: boolean;
  /** A locked bet reopened because a pick went void — only swaps are allowed. */
  reopened: boolean;
  isSolo: boolean;
  /** Per-member quota (SOLO_MAX_LEGS for solo bets). */
  legsPerMember: number;
  /** Your legs on the selected bet. */
  userLegs: GroupLeg[];
  canSubmitMore: boolean;
  /** Removing a pick is allowed (open bets that were never locked). */
  canRemove: boolean;
  /** Picks voided (postponed, cancelled…) that their owner can still swap. */
  swappableVoidLegs: GroupLeg[];
  /** 1-based slot for your next leg. */
  nextSlot: number;
  /** Heading for the add-leg form, or undefined for the default. */
  submitTitle: string | undefined;
  showLegIndex: boolean;
  /** First kickoff among live (non-void) legs — the betting / swap deadline. */
  firstKickoff: Date | null;
  /** First fixture has kicked off — betting has closed. */
  accaStarted: boolean;
  /** Members can change (and while open, remove) their picks until first kickoff. */
  editWindowOpen: boolean;
  resolvedLegCount: number;
  /** Banner over a locked bet; null while open. */
  lockedBanner: string | null;
  /** Banner explaining a void pick that can still be swapped; null otherwise. */
  voidBanner: string | null;
  /** Per-leg "Open" links only before any result is in. */
  showOpenLinks: boolean;
  legLinks: BetslipLinks["legLinks"] | undefined;
  acca: AccaSummaryView;
  /** Owner's cap on concurrent bets. */
  activeBetLimit: number;
  /** An open bet with no legs blocks creating another. */
  emptyOpenBet: boolean;
  canCreateRound: boolean;
  /** Explain why New Bet is disabled. */
  showEmptyBetHint: boolean;
};

export function selectActiveRounds(data: GroupDetailResponse): ActiveRound[] {
  if (data.activeRounds?.length) return data.activeRounds;
  return data.activeRound ? [data.activeRound] : [];
}

/** First kickoff among live legs. Void legs (postponed…) never kick off. */
export function firstKickoffOf(
  legs: ReadonlyArray<{ kickoff: string; outcome?: string }>
): Date | null {
  const live = legs.filter((l) => l.outcome !== "void");
  if (live.length === 0) return null;
  return new Date(Math.min(...live.map((l) => new Date(l.kickoff).getTime())));
}

/**
 * Explains a void pick on an open bet: who can swap it, until when, and what
 * happens if they don't.
 */
export function voidLegBanner({
  voidLegs,
  userId,
  deadline,
  reopened,
}: {
  voidLegs: ReadonlyArray<Pick<GroupLeg, "homeTeam" | "awayTeam" | "user">>;
  userId: string | null | undefined;
  deadline: Date | null;
  reopened: boolean;
}): string | null {
  const leg = voidLegs[0];
  if (!leg) return null;
  const fixture =
    voidLegs.length === 1 ? formatFixtureLabel(leg) : `${voidLegs.length} picks`;
  const verb = voidLegs.length === 1 ? "was" : "were";
  const lead = reopened
    ? `Bet reopened: ${fixture} ${verb} postponed or cancelled.`
    : `${fixture} ${verb} postponed or cancelled.`;
  const who =
    voidLegs.every((l) => l.user.id === userId)
      ? "You can swap your pick"
      : voidLegs.length === 1
        ? `${leg.user.name} can swap their pick`
        : "Their owners can swap them";
  const until = deadline ? ` until ${formatKickoff(deadline)}` : "";
  return `${lead} ${who}${until}, otherwise the acca goes ahead without it.`;
}

export function lockedRoundBanner(resolvedLegCount: number, legCount: number): string {
  if (resolvedLegCount > 0 && resolvedLegCount < legCount) {
    return `Acca in progress: ${resolvedLegCount} of ${legCount} legs settled`;
  }
  if (legCount > 0 && resolvedLegCount === legCount) {
    return "All legs settled. Acca will finalize shortly.";
  }
  return "Acca locked. Place your bet at the bookmaker.";
}

export function deriveRoundView({
  data,
  selectedRoundId,
  userId,
  now = Date.now(),
}: {
  data: GroupDetailResponse;
  selectedRoundId: string | null;
  userId: string | null | undefined;
  now?: number;
}): RoundView {
  const activeRounds = selectActiveRounds(data);
  const round =
    activeRounds.find((r) => r.id === selectedRoundId) ?? activeRounds[0] ?? null;
  const legs = round?.legs ?? [];
  const isOpen = round?.status === "open";
  const isLocked = round?.status === "locked";
  const reopened = isOpen && Boolean(round?.reopenedAt);
  const isSolo = Boolean(round?.unlimitedLegs);
  const legsPerMember = isSolo
    ? SOLO_MAX_LEGS
    : (round?.legsPerMember ?? data.group.legsPerMember ?? 1);

  const userLegs = userId ? legs.filter((l) => l.user.id === userId) : [];
  const canSubmitMore =
    Boolean(userId) && isOpen && !reopened && userLegs.length < legsPerMember;
  const nextSlot = userLegs.length + 1;
  const submitTitle = isSolo
    ? `Add leg ${nextSlot}`
    : legsPerMember > 1
      ? `Submit leg ${nextSlot} of ${legsPerMember}`
      : undefined;

  const firstKickoff = firstKickoffOf(legs);
  const accaStarted = Boolean(firstKickoff && now >= firstKickoff.getTime());
  const editWindowOpen =
    (isOpen || isLocked) && (!firstKickoff || now < firstKickoff.getTime());
  const swappableVoidLegs =
    isOpen && editWindowOpen ? legs.filter((l) => l.outcome === "void") : [];
  const resolvedLegCount = legs.filter((l) => l.outcome !== "pending").length;
  // Links stay up until a match is decided — a void pick isn't a result, and a
  // re-locked acca still needs placing.
  const noResultYet = !legs.some((l) => l.outcome === "won" || l.outcome === "lost");
  const betslipLinks = round?.betslipLinks ?? data.betslipLinks;
  const betslipLink = round?.betslipLink ?? data.betslipLink;

  const storedRankings = round?.accaBookmakerRankings ?? [];
  // Rankings captured before a pick went void still price it; each
  // bookmaker's quote for it isn't kept, so drop the comparison rather than
  // show wrong odds.
  const rankings =
    isLocked && lockedPriceIncludesVoidLegs(round?.combinedOdds ?? null, legs)
      ? []
      : storedRankings;
  // A void leg counts at 1.00 once the acca is locked.
  const lockedOdds = isLocked
    ? effectiveAccaOdds(round?.combinedOdds ?? null, legs)
    : (round?.combinedOdds ?? null);
  const combinedOdds = lockedOdds ?? rankings[0]?.combinedOdds ?? null;
  const bestBookmakerId = round?.bestBookmakerId ?? storedRankings[0]?.bookmakerId ?? null;
  const bookmakerName =
    storedRankings.find((r) => r.bookmakerId === bestBookmakerId)?.bookmakerName ??
    storedRankings.find((r) => r.bookmakerId === round?.bestBookmakerId)?.bookmakerName ??
    legs[0]?.bookmakerName ??
    null;

  const activeBetLimit = data.group.maxActiveBets ?? 1;
  const emptyOpenBet = activeRounds.some(
    (r) => r.status === "open" && r.legs.length === 0
  );
  const canCreateRound =
    activeBetLimit > 1 && activeRounds.length < activeBetLimit && !emptyOpenBet;

  return {
    activeRounds,
    round,
    isOpen,
    isLocked,
    reopened,
    isSolo,
    legsPerMember,
    userLegs,
    canSubmitMore,
    canRemove: isOpen && !reopened,
    swappableVoidLegs,
    nextSlot,
    submitTitle,
    showLegIndex: isSolo || legsPerMember > 1,
    firstKickoff,
    accaStarted,
    editWindowOpen,
    resolvedLegCount,
    lockedBanner: isLocked ? lockedRoundBanner(resolvedLegCount, legs.length) : null,
    voidBanner: voidLegBanner({
      voidLegs: swappableVoidLegs,
      userId,
      deadline: firstKickoff,
      reopened,
    }),
    showOpenLinks: isLocked && noResultYet,
    legLinks: betslipLinks?.legLinks,
    acca: {
      show:
        combinedOdds != null &&
        combinedOdds > 0 &&
        (isLocked || (isOpen && legs.length > 0 && rankings.length > 0)),
      combinedOdds,
      bestBookmakerId,
      bookmakerName,
      rankings,
      betslipLink: isOpen || (isLocked && noResultYet) ? betslipLink : null,
      betslipLinkQuality: betslipLinks?.primaryLinkQuality ?? null,
      betslipHasAllLegLinks: betslipLinks?.primaryHasAllLegLinks ?? false,
      compareDefaultOpen: !accaStarted,
      legCount: legs.filter((l) => l.outcome !== "void").length,
    },
    activeBetLimit,
    emptyOpenBet,
    canCreateRound,
    showEmptyBetHint:
      !canCreateRound && activeRounds.length < activeBetLimit && emptyOpenBet,
  };
}

/** Heading for the change-leg form. */
export function changeLegTitle(view: RoundView, legId: string): string | undefined {
  if (view.swappableVoidLegs.some((l) => l.id === legId)) return "Swap your void pick";
  if (view.legsPerMember <= 1) return undefined;
  return `Change leg ${view.userLegs.find((l) => l.id === legId)?.legIndex ?? ""}`;
}

/** Latest submit/change announcement per leg, so pick rows can mirror chat reactions. */
export function announcementsByLegId(
  messages: RoundMessageDto[]
): Map<string, RoundMessageDto> {
  const byLeg = new Map<string, RoundMessageDto>();
  for (const message of messages) {
    if (
      message.legId &&
      (message.eventType === "leg_submitted" || message.eventType === "leg_changed")
    ) {
      byLeg.set(message.legId, message);
    }
  }
  return byLeg;
}

/** Flash shown after you add a leg: "All legs added" once your quota is full. */
export function legAddedCelebration(
  userLegCount: number,
  legsPerMember: number
): "Leg added" | "All legs added" {
  return userLegCount >= legsPerMember ? "All legs added" : "Leg added";
}

/** Labels for the combined-odds card and its betslip button. */
export function accaSummaryCopy({
  inProgress,
  preview,
  bookmakerName,
  topBookmakerName,
  linkQuality,
  legCount,
  hasAllLegLinks,
  singleBookmaker,
}: {
  /** Locked acca — frozen odds; outcomes may be in progress. */
  inProgress: boolean;
  /** Open round — live odds from legs so far. */
  preview: boolean;
  bookmakerName: string | null | undefined;
  topBookmakerName: string | null | undefined;
  linkQuality: "deeplink" | "hub" | null;
  legCount: number;
  hasAllLegLinks: boolean;
  singleBookmaker: boolean;
}): {
  oddsLabel: string;
  bookmakerLine: string;
  previewNote: string | null;
  multiBookmakerNote: string | null;
  ctaLabel: string;
  ctaHint: string | null;
} {
  const ctaBookmaker =
    (inProgress && bookmakerName) ||
    (!inProgress && topBookmakerName) ||
    bookmakerName ||
    null;
  const multiLeg = legCount > 1;
  return {
    oddsLabel: inProgress
      ? "Locked combined odds"
      : preview
        ? "Current combined odds"
        : "Combined odds",
    bookmakerLine: inProgress
      ? `Locked at ${bookmakerName}`
      : preview
        ? `Best so far at ${bookmakerName}`
        : `Best at ${bookmakerName}`,
    previewNote: preview
      ? "Based on legs submitted so far. Final odds lock when the bet closes."
      : null,
    multiBookmakerNote:
      !singleBookmaker && !preview
        ? inProgress
          ? "Best per-leg odds locked at submission"
          : "Place legs individually"
        : null,
    ctaLabel:
      linkQuality === "hub"
        ? ctaBookmaker
          ? `Open ${ctaBookmaker}`
          : "Open bookmaker"
        : multiLeg
          ? `Open first pick${ctaBookmaker ? ` · ${ctaBookmaker}` : ""}`
          : `Open betslip${ctaBookmaker ? ` · ${ctaBookmaker}` : ""}`,
    ctaHint:
      linkQuality === "hub"
        ? "Opens the bookmaker’s football section. Add each pick on-site, or use Open on a pick when a deeplink is available."
        : multiLeg
          ? hasAllLegLinks
            ? "Opens the first selection. Use Open on each pick below to add the rest at this bookmaker."
            : "Opens the closest available selection. Use Open on each pick to build the acca."
          : null,
  };
}
