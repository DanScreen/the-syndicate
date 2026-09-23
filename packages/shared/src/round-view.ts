import type { AccaBookmakerRanking } from "./acca";
import type {
  ActiveRound,
  BetslipLinks,
  GroupDetailResponse,
  GroupLeg,
} from "./api-types";
import type { RoundMessageDto } from "./chat";
import { SOLO_MAX_LEGS } from "./constants";

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
  isSolo: boolean;
  /** Per-member quota (SOLO_MAX_LEGS for solo bets). */
  legsPerMember: number;
  /** Your legs on the selected bet. */
  userLegs: GroupLeg[];
  canSubmitMore: boolean;
  /** 1-based slot for your next leg. */
  nextSlot: number;
  /** Heading for the add-leg form, or undefined for the default. */
  submitTitle: string | undefined;
  showLegIndex: boolean;
  firstKickoff: Date | null;
  /** First fixture has kicked off — betting has closed. */
  accaStarted: boolean;
  /** Members can change (and while open, remove) their picks until first kickoff. */
  editWindowOpen: boolean;
  resolvedLegCount: number;
  /** Banner over a locked bet; null while open. */
  lockedBanner: string | null;
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

export function firstKickoffOf(legs: { kickoff: string }[]): Date | null {
  if (legs.length === 0) return null;
  return new Date(Math.min(...legs.map((l) => new Date(l.kickoff).getTime())));
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
  const isSolo = Boolean(round?.unlimitedLegs);
  const legsPerMember = isSolo
    ? SOLO_MAX_LEGS
    : (round?.legsPerMember ?? data.group.legsPerMember ?? 1);

  const userLegs = userId ? legs.filter((l) => l.user.id === userId) : [];
  const canSubmitMore = Boolean(userId) && isOpen && userLegs.length < legsPerMember;
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
  const resolvedLegCount = legs.filter((l) => l.outcome !== "pending").length;
  const betslipLinks = round?.betslipLinks ?? data.betslipLinks;
  const betslipLink = round?.betslipLink ?? data.betslipLink;

  const rankings = round?.accaBookmakerRankings ?? [];
  const combinedOdds = round?.combinedOdds ?? rankings[0]?.combinedOdds ?? null;
  const bestBookmakerId = round?.bestBookmakerId ?? rankings[0]?.bookmakerId ?? null;
  const bookmakerName =
    rankings.find((r) => r.bookmakerId === bestBookmakerId)?.bookmakerName ??
    rankings.find((r) => r.bookmakerId === round?.bestBookmakerId)?.bookmakerName ??
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
    isSolo,
    legsPerMember,
    userLegs,
    canSubmitMore,
    nextSlot,
    submitTitle,
    showLegIndex: isSolo || legsPerMember > 1,
    firstKickoff,
    accaStarted,
    editWindowOpen,
    resolvedLegCount,
    lockedBanner: isLocked ? lockedRoundBanner(resolvedLegCount, legs.length) : null,
    showOpenLinks: isLocked && resolvedLegCount === 0,
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
      betslipLink: isOpen || (isLocked && resolvedLegCount === 0) ? betslipLink : null,
      betslipLinkQuality: betslipLinks?.primaryLinkQuality ?? null,
      betslipHasAllLegLinks: betslipLinks?.primaryHasAllLegLinks ?? false,
      compareDefaultOpen: !accaStarted,
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
