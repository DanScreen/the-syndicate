import {
  escapeHtml,
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
      // A dead CTA here locks someone out of their account entirely, so the URL
      // is repeated as text rather than living only in the plain-text part.
      ctaFallbackUrl: params.resetUrl,
      showPreferencesLink: false,
    }),
    text,
  };
}

export function verifyEmailEmail(params: { verifyUrl: string; firstName: string }): EmailDocument {
  const greeting = params.firstName ? `Hi ${params.firstName},` : "Hi,";
  const bodyHtml = [
    paragraph(escapeHtml(greeting)),
    paragraph("Confirm this is your email address to finish setting up your Tiki Acca account."),
    mutedNote("This link expires in 24 hours. If you didn't create a Tiki Acca account, you can ignore this email."),
  ].join("");

  const text = [
    "Confirm your Tiki Acca email",
    "",
    greeting,
    "Confirm this is your email address to finish setting up your Tiki Acca account.",
    `Confirm it here: ${params.verifyUrl}`,
    "",
    "This link expires in 24 hours.",
    "If you didn't create a Tiki Acca account, you can ignore this email.",
  ].join("\n");

  return {
    subject: "Confirm your Tiki Acca email",
    preheader: "One tap to finish setting up your account.",
    html: renderEmailLayout({
      preheader: "One tap to finish setting up your account.",
      eyebrow: "Welcome",
      title: "Confirm your email",
      bodyHtml,
      ctaLabel: "Confirm email",
      ctaUrl: params.verifyUrl,
      // Same as the reset email: a dead CTA would leave the account gated.
      ctaFallbackUrl: params.verifyUrl,
      showPreferencesLink: false,
    }),
    text,
  };
}
