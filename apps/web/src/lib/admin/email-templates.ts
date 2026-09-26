import {
  EMAIL_COLORS,
  escapeHtml,
  mutedNote,
  paragraph,
  renderEmailLayout,
  type EmailDocument,
} from "@/lib/notifications/email-layout";

/** Alert to platform admins that a member reported a group chat message. */
export function messageReportedEmail(params: {
  messageId: string;
  authorName: string | null;
  groupName: string;
  body: string;
  reason: string | null;
}): EmailDocument {
  const c = EMAIL_COLORS;
  const author = params.authorName ?? "Unknown member";
  const reason = params.reason?.trim() || "No reason given";
  const preview = params.body.length > 200 ? `${params.body.slice(0, 200)}…` : params.body;

  const quote =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;">` +
    `<tr><td style="padding:14px 16px;border-left:3px solid ${c.danger};background-color:${c.background};border-radius:0 8px 8px 0;">` +
    `<div style="font-size:12px;font-weight:700;color:${c.muted};margin-bottom:6px;">${escapeHtml(author)} in ${escapeHtml(params.groupName)}</div>` +
    `<div style="font-size:15px;line-height:1.5;color:${c.foreground};white-space:pre-wrap;word-break:break-word;">${escapeHtml(preview)}</div>` +
    `</td></tr></table>`;

  const bodyHtml = [
    paragraph("A member reported this group chat message:"),
    quote,
    paragraph(`<strong>Reason:</strong> ${escapeHtml(reason)}`),
    mutedNote(`Message id: ${escapeHtml(params.messageId)}. The report is stored in <code>MessageReport</code>.`),
  ].join("");

  const subject = `Chat message reported in ${params.groupName}`;
  const preheader = `${author}: ${preview}`.slice(0, 120);
  return {
    subject,
    preheader,
    html: renderEmailLayout({
      preheader,
      eyebrow: "Moderation",
      title: "A chat message was reported",
      bodyHtml,
      showPreferencesLink: false,
    }),
    text: [
      "A chat message was reported",
      "",
      `Group: ${params.groupName}`,
      `Author: ${author}`,
      `Message: ${preview}`,
      `Reason: ${reason}`,
      `Message id: ${params.messageId}`,
    ].join("\n"),
  };
}
