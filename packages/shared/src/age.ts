/**
 * Date-of-birth helpers for the 18+ age gate applied at sign-up.
 *
 * Dates are handled as plain `YYYY-MM-DD` calendar strings (the value produced
 * by an HTML `<input type="date">`), deliberately avoiding `Date` parsing of the
 * DOB so that the user's timezone can never shift their birthday by a day.
 */

/** Minimum age required to create an account. */
export const MIN_SIGN_UP_AGE = 18;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parsed `{ y, m, d }` for a real calendar date, or null if malformed/invalid. */
function parseCalendarDate(
  value: string
): { y: number; m: number; d: number } | null {
  const match = DATE_RE.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  // Reject impossible dates (e.g. 2001-02-29, month 13) by round-tripping
  // through a UTC Date and checking the parts survive unchanged.
  const asDate = new Date(Date.UTC(y, m - 1, d));
  if (
    asDate.getUTCFullYear() !== y ||
    asDate.getUTCMonth() !== m - 1 ||
    asDate.getUTCDate() !== d
  ) {
    return null;
  }
  return { y, m, d };
}

/** True if `value` is a real `YYYY-MM-DD` calendar date. */
export function isValidDateOfBirth(value: string): boolean {
  return parseCalendarDate(value) !== null;
}

/**
 * Whole years of age on `today` for a `YYYY-MM-DD` date of birth.
 * Returns null if the date string is not a valid calendar date.
 */
export function ageInYears(dob: string, today: Date = new Date()): number | null {
  const parsed = parseCalendarDate(dob);
  if (!parsed) return null;
  const ty = today.getFullYear();
  const tm = today.getMonth() + 1;
  const td = today.getDate();
  let age = ty - parsed.y;
  // Not yet had this year's birthday? Subtract one.
  if (tm < parsed.m || (tm === parsed.m && td < parsed.d)) {
    age -= 1;
  }
  return age;
}

/** True if the DOB is a valid date and the person is at least `MIN_SIGN_UP_AGE`. */
export function meetsMinimumAge(dob: string, today: Date = new Date()): boolean {
  const age = ageInYears(dob, today);
  return age !== null && age >= MIN_SIGN_UP_AGE;
}
