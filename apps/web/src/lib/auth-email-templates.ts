import {
  mutedNote,
  paragraph,
  renderEmailLayout,
  type EmailDocument,
} from "@/lib/notifications/email-layout";

export function resetPasswordEmail(params: { resetUrl: string }): EmailDocument {
  const bodyHtml = [
    paragraph("We got a request to reset the password on your Tiki Acca account."),
    mutedNote("This link expires in 1 hour and can only be used once. If you didn't request this, you can ignore this email — your password won't change."),
  ].join("");

  const text = [
    "Reset your Tiki Acca password",
    "",
    "We got a request to reset the password on your account.",
    `Reset it here: ${params.resetUrl}`,
    "",
    "This link expires in 1 hour and can only be used once.",
    "If you didn't request this, you can ignore this email — your password won't change.",
  ].join("\n");

  return {
    subject: "Reset your Tiki Acca password",
    preheader: "This link expires in 1 hour.",
    html: renderEmailLayout({
      preheader: "This link expires in 1 hour.",
      eyebrow: "Password reset",
      title: "Reset your password",
      bodyHtml,
      ctaLabel: "Reset password",
      ctaUrl: params.resetUrl,
    }),
    text,
  };
}
