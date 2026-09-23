import { z } from "zod";

/**
 * Sign-up email rules, stricter than `z.string().email()` alone. Shared by the
 * sign-up API, the unverified change-email API and both clients, so a typo is
 * caught before the account (and a verification email) is created.
 *
 * Format checking can't prove an address exists — that is what the
 * verification email is for. The server additionally checks the domain has
 * mail DNS records (`apps/web/src/lib/email-domain.ts`).
 */

/** RFC 5321 path limit. */
export const MAX_EMAIL_LENGTH = 254;

// RFC 2606 / 6761 names that can never receive real mail.
const RESERVED_TLDS = new Set(["test", "example", "invalid", "localhost", "local"]);
const RESERVED_DOMAINS = new Set(["example.com", "example.net", "example.org"]);

/**
 * Common misspellings of the big consumer mail providers → the intended domain.
 * Rejected with a "did you mean" hint rather than silently corrected.
 */
const DOMAIN_TYPOS: Record<string, string> = {
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmail.coom": "gmail.com",
  "gmail.co.uk": "gmail.com",
  "gmai.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmsil.com": "gmail.com",
  "googlemail.con": "googlemail.com",
  "hotmail.con": "hotmail.com",
  "hotmail.co": "hotmail.co.uk",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmil.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "homail.com": "hotmail.com",
  "hotmail.co.uk.com": "hotmail.co.uk",
  "outlook.con": "outlook.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "yahoo.con": "yahoo.com",
  "yahoo.co": "yahoo.co.uk",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "icloud.con": "icloud.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
  "live.con": "live.com",
  "btinternet.con": "btinternet.com",
};

const LOCAL_PART = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const DOMAIN_LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
const TLD = /^[a-z]{2,63}$/i;

export type EmailCheck = { ok: true } | { ok: false; message: string };

/** Returns why `raw` isn't a usable sign-up address, or `{ ok: true }`. */
export function checkEmailFormat(raw: string): EmailCheck {
  const email = raw.trim().toLowerCase();
  const invalid = { ok: false as const, message: "Enter a valid email address" };

  if (!email) return { ok: false, message: "Enter your email address" };
  if (email.length > MAX_EMAIL_LENGTH) return invalid;

  const at = email.lastIndexOf("@");
  if (at <= 0 || at !== email.indexOf("@")) return invalid;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || !LOCAL_PART.test(local)) return invalid;

  const labels = domain.split(".");
  if (labels.length < 2 || !labels.every((l) => DOMAIN_LABEL.test(l))) return invalid;

  const tld = labels[labels.length - 1];
  if (!TLD.test(tld)) return invalid;
  if (RESERVED_TLDS.has(tld) || RESERVED_DOMAINS.has(domain)) {
    return { ok: false, message: "Use a real email address — we'll send you a link to confirm it" };
  }

  const suggestion = DOMAIN_TYPOS[domain];
  if (suggestion) {
    return { ok: false, message: `Did you mean ${local}@${suggestion}?` };
  }

  return { ok: true };
}

/** Zod field for any address a user registers or switches to. Trims + lowercases. */
export const signUpEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .superRefine((value, ctx) => {
    const result = checkEmailFormat(value);
    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.message });
    }
  });

/** Stable error code on 403s from `requireSession` for unverified accounts. */
export const EMAIL_UNVERIFIED_CODE = "email_unverified";
