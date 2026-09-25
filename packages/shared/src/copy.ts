import type { NotificationPreferences } from "./notification-types";

/**
 * User-facing copy shared by web and mobile. Change wording here, not in either
 * app, so both surfaces say the same thing.
 */
export const copy = {
  dashboard: {
    emptyTitle: "No groups yet.",
    emptyBody: "Create a group for your mates or join with an invite code.",
    welcomeTitle: "Welcome To Tiki Acca",
    welcomeIntro: "Get your mates together in three steps:",
    welcomeSteps: [
      "Create a group and share the invite link",
      "Each member picks their legs in the open round",
      "When everyone's in, the acca locks and you get the best combined odds",
    ],
    welcomeCta: "Create your first group",
  },
  join: {
    title: "Join A Group",
    subtitle:
      "Enter the invite code shared by your group owner, or open their invite link directly.",
    placeholder: "ABCD1234",
  },
  invite: {
    tab: "Invite",
    title: "Invite mates",
    subtitle: "Anyone with the code or link can join this group.",
    codeLabel: "Invite code",
    linkLabel: "Invite link",
    copyLink: "Copy invite link",
    copied: "Copied!",
    share: "Share invite link",
    shareMessage: (groupName: string, url: string) =>
      `Join ${groupName} on Tiki Acca and add your pick to our acca: ${url}`,
  },
  group: {
    notFound: "Group not found or you are not a member.",
    loadFailed: "Failed to load group",
  },
  chat: {
    report: "Report message",
    reportConfirmTitle: "Report this message?",
    reportConfirmBody: "Our team will review it. The author won't be told who reported it.",
    reported: "Thanks. We'll review this message.",
    reportFailed: "Couldn't report that message.",
    block: (name: string) => `Block ${name}`,
    blockConfirmTitle: (name: string) => `Block ${name}?`,
    blockConfirmBody:
      "You won't see their messages anywhere. You can unblock them from Account.",
    blocked: (name: string) =>
      `${name}'s messages are now hidden. You can unblock them from Account.`,
    blockFailed: "Couldn't block that member.",
  },
  blockedMembers: {
    title: "Blocked members",
    empty: "You haven't blocked anyone.",
    unblock: "Unblock",
    unblockFailed: "Couldn't unblock that member.",
  },
  legPicker: {
    loadingCompetitions: "Loading competitions…",
    noCompetitions:
      "No competitions are available for picks right now. Check back soon.",
    loadingFixtures: "Loading fixtures…",
    noFixturesLive:
      "No upcoming fixtures with bookmaker odds right now. Try again closer to kickoff.",
    noFixturesMock: "No demo fixtures available.",
    loadingMarkets: "Loading popular markets…",
    marketsError: "Failed to load markets",
    marketsEmptyTier: (label: string) =>
      `${label} aren't available for this fixture from UK bookmakers right now.`,
    bestOddsHint:
      "You'll submit at the best available odds. The group acca bookmaker is chosen when all legs are in.",
    multiLegFirst: (legsPerMember: number) =>
      `You'll pick ${legsPerMember} legs from different fixtures — start with leg 1.`,
    multiLegNext: (previousLeg: number, currentLeg: number) =>
      `Leg ${previousLeg} saved. Pick a different fixture for leg ${currentLeg}.`,
  },
  stats: {
    noGroupRounds:
      "No settled rounds yet. Stats appear after your first round is settled.",
    noUserLegs: "No settled legs yet. Stats appear after your first round settles.",
    loadFailed: "Failed to load stats",
    shareButton: "Share performance",
  },
} as const;

/**
 * Responsible-gambling wording. Regulated copy: keep it in this one place.
 * The long-form legal pages on web link to the same helpline.
 */
export const COMPLIANCE = {
  betslipDisclosure:
    "18+. Bets are placed with licensed bookmakers, not Tiki Acca. We earn commission from some bookmakers if you sign up or bet via these links. Gamble responsibly:",
  footerTitle: "Gamble responsibly",
  footerBody:
    "Tiki Acca helps groups coordinate accumulator ideas. We do not take bets or handle money. You place bets directly with licensed bookmakers. We earn commission from some bookmakers if you sign up or bet via our links.",
  gambleawareLabel: "GambleAware.org",
  gambleawareUrl: "https://www.gambleaware.org",
  helplineName: "National Gambling Helpline",
  helplineNumber: "0808 8020 133",
} as const;

export type NotificationPreferenceItem = {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
};

export type NotificationPreferenceSection = {
  channel: "email" | "push";
  title: string;
  items: NotificationPreferenceItem[];
};

/** Every notification toggle, in display order. Add new preferences here once. */
export const NOTIFICATION_PREFERENCE_SECTIONS: NotificationPreferenceSection[] = [
  {
    channel: "email",
    title: "Email",
    items: [
      {
        key: "emailPickReminder",
        label: "Pick reminders",
        description: "Nudge you to submit before the acca locks at kickoff.",
      },
      {
        key: "emailRoundLocked",
        label: "Acca locked",
        description: "When your group acca is locked and ready to place.",
      },
      {
        key: "emailRoundSettled",
        label: "Round settled",
        description: "When a round finishes and points are updated.",
      },
    ],
  },
  {
    channel: "push",
    title: "Push",
    items: [
      {
        key: "pushPickReminder",
        label: "Pick reminders",
        description: "Last-minute nudges on your phone before kickoff.",
      },
      {
        key: "pushRoundLocked",
        label: "Acca locked",
        description: "When the acca locks.",
      },
      {
        key: "pushRoundSettled",
        label: "Round settled",
        description: "When results are in.",
      },
      {
        key: "pushChat",
        label: "Group chat",
        description: "Batched alerts when your group starts chatting.",
      },
    ],
  },
];
