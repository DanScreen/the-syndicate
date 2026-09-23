import { encodeLineKey } from "@tiki-acca/shared";

/**
 * Before the line-key fix, whole-number lines were encoded without a tenths digit
 * (2 → "2", 10 → "10") but always decoded as tenths (→ 0.2, 1.0). The key alone is
 * ambiguous — legacy "10" meant line 10, today "10" means line 1 — so the true line
 * is recovered from the labels stored on the leg, which always carried the real number.
 */

export type LineKeyLeg = {
  marketType: string;
  marketLabel: string;
  selectionId: string;
  selectionLabel: string;
};

export type LineKeyRepair =
  | { status: "ok" }
  | { status: "fix"; marketType: string; line: number }
  | { status: "unsupported"; line: number }
  | { status: "unparseable" };

const OVER_UNDER_TYPE = /^((?:corners_|cards_)?over_under)_(m?\d+)$/;
const HANDICAP_TYPE = /^((?:asian|corners|cards)_handicap)_(m?\d+)$/;
const EMBEDDED_TYPE = /^(.+__)(m?\d+)$/;

const NUMBER = "([+-]?\\d+(?:\\.\\d+)?)";

function parseNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function overUnderLine(leg: LineKeyLeg): number | null {
  return (
    parseNumber(leg.selectionLabel, new RegExp(`^\\s*(?:over|under)\\s+${NUMBER}`, "i")) ??
    parseNumber(leg.marketLabel, new RegExp(`(?:O/U|Over/Under)\\s+${NUMBER}`, "i"))
  );
}

function handicapHomeLine(leg: LineKeyLeg): number | null {
  const fromLabel = parseNumber(leg.marketLabel, new RegExp(`Handicap\\s+${NUMBER}\\s*$`, "i"));
  if (fromLabel !== null) return fromLabel;

  const match = leg.selectionId.match(/^(home|away)_(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const point = Number(match[2]);
  return match[1] === "home" ? point : -point;
}

function classify(prefix: string, currentKey: string, line: number | null): LineKeyRepair {
  if (line === null) return { status: "unparseable" };
  const key = encodeLineKey(line);
  if (key === null) return { status: "unsupported", line };
  if (key === currentKey) return { status: "ok" };
  return { status: "fix", marketType: `${prefix}${key}`, line };
}

/** Returns the canonical market type for a leg whose type embeds a line, or null if it has none. */
export function repairLegLineKey(leg: LineKeyLeg): LineKeyRepair | null {
  const ou = leg.marketType.match(OVER_UNDER_TYPE);
  if (ou) return classify(`${ou[1]}_`, ou[2]!, overUnderLine(leg));

  const handicap = leg.marketType.match(HANDICAP_TYPE);
  if (handicap) return classify(`${handicap[1]}_`, handicap[2]!, handicapHomeLine(leg));

  const embedded = leg.marketType.match(EMBEDDED_TYPE);
  if (embedded) {
    // Player yes/no props share the `__<slug>` shape; only O/U legs carry a line.
    const line = overUnderLine(leg);
    if (line === null) return null;
    return classify(embedded[1]!, embedded[2]!, line);
  }

  return null;
}
