import { BRAND_COLORS } from "@tiki-acca/shared";

export function appBaseUrl(): string {
  return process.env.NEXTAUTH_URL ?? "https://www.tikiacca.com";
}

/** Turf Green tokens for email HTML (table-based clients). */
export const EMAIL_COLORS = {
  background: BRAND_COLORS.background,
  card: BRAND_COLORS.card,
  accent: BRAND_COLORS.accent,
  accentBright: BRAND_COLORS.accentBright,
  accentMuted: BRAND_COLORS.accentMuted,
  foreground: BRAND_COLORS.foreground,
  muted: BRAND_COLORS.muted,
  border: BRAND_COLORS.border,
  danger: BRAND_COLORS.danger,
  white: "#ffffff",
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function logoUrl(): string {
  return `${appBaseUrl()}/brand/email-logo.png`;
}

export function notificationSettingsUrl(): string {
  return `${appBaseUrl()}/account#notifications`;
}

export type EmailDocument = {
  subject: string;
  /** Inbox preview snippet (hidden in body). */
  preheader: string;
  html: string;
  text: string;
};

type LayoutParams = {
  preheader: string;
  eyebrow: string;
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote?: string;
};

/**
 * Branded transactional email shell — dark Turf Green, logo, CTA, prefs footer.
 * Table layout for Outlook/Gmail; inline styles only.
 */
export function renderEmailLayout(params: LayoutParams): string {
  const c = EMAIL_COLORS;
  const settingsUrl = notificationSettingsUrl();
  const homeUrl = appBaseUrl();
  const logo = logoUrl();
  const preheader = escapeHtml(params.preheader);
  const eyebrow = escapeHtml(params.eyebrow);
  const title = escapeHtml(params.title);
  const ctaLabel = escapeHtml(params.ctaLabel);
  const ctaUrl = params.ctaUrl;
  const footerNote = params.footerNote
    ? `<p style="margin:0 0 12px;font-size:12px;line-height:1.5;color:${c.muted};">${params.footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="dark"/>
<meta name="supported-color-schemes" content="dark"/>
<title>Tiki Acca</title>
</head>
<body style="margin:0;padding:0;background-color:${c.background};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.background};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${c.card};border:1px solid ${c.border};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="height:4px;background-color:${c.accent};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <a href="${homeUrl}" style="text-decoration:none;">
                      <img src="${logo}" width="40" height="40" alt="Tiki Acca" style="display:block;border:0;border-radius:20px;"/>
                    </a>
                  </td>
                  <td style="vertical-align:middle;">
                    <a href="${homeUrl}" style="text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:${c.foreground};letter-spacing:-0.02em;">
                      Tiki <span style="color:${c.accent};">Acca</span>
                    </a>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${c.muted};margin-top:2px;">
                      Social Group Betting
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 8px;">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${c.accentBright};">
                ${eyebrow}
              </p>
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:${c.foreground};">
                ${title}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${c.foreground};">
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;" align="left">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:${c.accent};">
                    <a href="${ctaUrl}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${c.background};text-decoration:none;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;border-top:1px solid ${c.border};font-family:Arial,Helvetica,sans-serif;">
              ${footerNote}
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${c.muted};">
                We&apos;re not a bookmaker — we keep the score. You place bets with licensed UK operators. 18+.
                <a href="https://www.gambleaware.org/" style="color:${c.accentBright};text-decoration:underline;">GambleAware</a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:${c.muted};">
                <a href="${settingsUrl}" style="color:${c.accentBright};text-decoration:underline;">Manage notification preferences</a>
                ·
                <a href="${homeUrl}" style="color:${c.muted};text-decoration:underline;">tikiacca.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderLegList(
  items: Array<{
    primary: string;
    secondary?: string;
    badge?: string;
    badgeTone?: "won" | "lost" | "void" | "neutral";
  }>
): string {
  const c = EMAIL_COLORS;
  const rows = items
    .map((item, i) => {
      const border =
        i < items.length - 1 ? `border-bottom:1px solid ${c.border};` : "";
      const badgeColor =
        item.badgeTone === "won"
          ? c.accentBright
          : item.badgeTone === "lost"
            ? c.danger
            : item.badgeTone === "void"
              ? c.muted
              : c.accent;
      const badge = item.badge
        ? `<span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;color:${c.background};background-color:${badgeColor};">${escapeHtml(item.badge)}</span>`
        : "";
      const secondary = item.secondary
        ? `<div style="margin-top:4px;font-size:13px;color:${c.muted};">${item.secondary}</div>`
        : "";
      return `<tr>
        <td style="padding:12px 0;${border}">
          <div style="font-size:14px;font-weight:700;color:${c.foreground};">
            ${item.primary}${badge}
          </div>
          ${secondary}
        </td>
      </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;border-collapse:collapse;">
    ${rows}
  </table>`;
}

export function highlightChip(label: string): string {
  const c = EMAIL_COLORS;
  return `<span style="display:inline-block;padding:6px 12px;border-radius:8px;background-color:${c.accentMuted};color:${c.accentBright};font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.02em;">${escapeHtml(label)}</span>`;
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 14px;">${html}</p>`;
}

export function mutedNote(html: string): string {
  const c = EMAIL_COLORS;
  return `<p style="margin:0 0 14px;font-size:13px;color:${c.muted};">${html}</p>`;
}
