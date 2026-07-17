/**
 * Lightweight, dependency-free profanity filter shared by web + mobile.
 *
 * Used to reject offensive sign-up names, group names, and chat messages. It
 * runs in both the Next.js server and the React Native runtime, so it must
 * stay pure TS with no external dependencies.
 *
 * Design notes:
 * - We normalise common leetspeak (e.g. "sh1t", "@ss") before matching so the
 *   obvious evasions are caught.
 * - Matching is word/token based to avoid the "Scunthorpe problem" — legitimate
 *   names like "Scunthorpe", "Cockburn", or "Assange" must not be flagged just
 *   because a rude substring hides inside them.
 * - A short list of severe slurs is additionally matched as substrings, since
 *   those have no legitimate embedding worth protecting.
 */

/** Words blocked when they appear as a standalone token (after normalisation). */
const BLOCKED_WORDS: readonly string[] = [
  "arse",
  "arsehole",
  "ass",
  "asshole",
  "bastard",
  "bellend",
  "bitch",
  "bollocks",
  "bollock",
  "boob",
  "bugger",
  "cock",
  "cocksucker",
  "coon",
  "crap",
  "cum",
  "cunt",
  "damn",
  "dick",
  "dickhead",
  "dildo",
  "dyke",
  "fag",
  "faggot",
  "fanny",
  "fuck",
  "fucker",
  "fucking",
  "gash",
  "goddamn",
  "hoe",
  "jerkoff",
  "jizz",
  "knob",
  "knobhead",
  "minge",
  "motherfucker",
  "nazi",
  "nigga",
  "nigger",
  "nonce",
  "paki",
  "penis",
  "piss",
  "prick",
  "pussy",
  "queer",
  "retard",
  "shit",
  "shite",
  "slag",
  "slut",
  "spastic",
  "spic",
  "tit",
  "tits",
  "titties",
  "tosser",
  "twat",
  "vagina",
  "wank",
  "wanker",
  "whore",
];

/**
 * Severe slurs blocked even when embedded inside another token — these have no
 * legitimate use as part of a name or group name. Kept deliberately narrow:
 * words like "cunt"/"coon" live only in BLOCKED_WORDS (token match) because they
 * appear inside legitimate names ("Scunthorpe", "Cocoon").
 */
const BLOCKED_SUBSTRINGS: readonly string[] = [
  "nigger",
  "nigga",
  "faggot",
  "chink",
  "kike",
  "tranny",
];

const BLOCKED_WORD_SET = new Set(BLOCKED_WORDS);

/** Map common leetspeak / lookalike characters to their alphabetic form. */
const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  $: "s",
  "!": "i",
  "|": "i",
};

/** Collapse leetspeak and strip anything that isn't a latin letter, to spaces. */
function normalise(input: string): string {
  const lowered = input.toLowerCase();
  let out = "";
  for (const char of lowered) {
    if (char >= "a" && char <= "z") {
      out += char;
    } else if (LEET_MAP[char]) {
      out += LEET_MAP[char];
    } else {
      out += " ";
    }
  }
  return out;
}

/** Returns true if the given text contains blocked profanity. */
export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const normalised = normalise(text);

  // Token-based match for the general word list (avoids the Scunthorpe problem).
  const tokens = normalised.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (BLOCKED_WORD_SET.has(token)) return true;
  }

  const collapsed = normalised.replace(/\s+/g, "");

  // Exact match on the whitespace-stripped form catches single words spaced or
  // punctuated apart ("F U C K", "s.h.i.t") without the substring false
  // positives that a general includes() check would cause ("ass" in "Cassandra").
  if (BLOCKED_WORD_SET.has(collapsed)) return true;

  // Substring match for severe slurs, on the whitespace-stripped form so that
  // spacing/punctuation evasions ("n i g g e r") are still caught.
  for (const slur of BLOCKED_SUBSTRINGS) {
    if (collapsed.includes(slur)) return true;
  }

  return false;
}
