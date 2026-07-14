type SendEmailParams = {
  to: string[];
  subject: string;
  html: string;
};

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return false;
  }

  const recipients = params.to.filter(Boolean);
  if (recipients.length === 0) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      console.error("Email send failed:", await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}

export function appBaseUrl(): string {
  return process.env.NEXTAUTH_URL ?? "https://www.tikiacca.com";
}
