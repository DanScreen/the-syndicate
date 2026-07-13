import { appBaseUrl } from "@/lib/notifications/email";

export function formatNotificationDeadline(date: Date): string {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

function emailFooter(): string {
  const settingsUrl = `${appBaseUrl()}/settings/notifications`;
  return `
    <p style="margin-top:24px;font-size:12px;color:#94a3b8;">
      <a href="${settingsUrl}">Manage notification preferences</a>
    </p>
  `;
}

export function pickReminderEmail(params: {
  groupName: string;
  deadline: Date;
  pendingCount: number;
  groupUrl: string;
}): { subject: string; html: string } {
  const time = formatNotificationDeadline(params.deadline);
  return {
    subject: `${params.groupName} — pick your leg (locks ${time})`,
    html: `
      <p>Your syndicate acca locks at <strong>${time}</strong> when the first match kicks off.</p>
      <p>You haven&apos;t submitted a leg yet${
        params.pendingCount > 1
          ? ` — ${params.pendingCount} members still waiting`
          : ""
      }.</p>
      <p><a href="${params.groupUrl}">Submit your pick on The Syndicate</a></p>
      ${emailFooter()}
    `,
  };
}

export function roundLockedEmail(params: {
  groupName: string;
  combinedOdds: string;
  legLines: string;
  partialNote: string;
  groupUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${params.groupName} — acca locked`,
    html: `
      <p>Your syndicate acca is locked and ready to place.</p>
      <p><strong>Combined odds:</strong> ${params.combinedOdds}</p>
      <ul>${params.legLines}</ul>
      ${params.partialNote}
      <p><a href="${params.groupUrl}">View acca on The Syndicate</a></p>
      ${emailFooter()}
    `,
  };
}

export function roundSettledEmail(params: {
  groupName: string;
  plLabel: string;
  wonCount: number;
  lostCount: number;
  legLines: string;
  groupUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${params.groupName} — round settled (${params.wonCount}W ${params.lostCount}L)`,
    html: `
      <p>Your syndicate round has been settled.</p>
      <p><strong>Acca P/L (£10 stake):</strong> ${params.plLabel}</p>
      <ul>${params.legLines}</ul>
      <p><a href="${params.groupUrl}">View stats on The Syndicate</a></p>
      ${emailFooter()}
    `,
  };
}

export function pickReminderPush(params: {
  groupName: string;
  deadline: Date;
}): { title: string; body: string } {
  const time = formatNotificationDeadline(params.deadline);
  return {
    title: `${params.groupName} — pick your leg`,
    body: `Acca locks at ${time}. Submit your pick before kickoff.`,
  };
}

export function roundLockedPush(groupName: string): { title: string; body: string } {
  return {
    title: `${groupName} — acca locked`,
    body: "Your syndicate acca is locked. Open the app to place your bet.",
  };
}

export function roundSettledPush(params: {
  groupName: string;
  wonCount: number;
  lostCount: number;
}): { title: string; body: string } {
  return {
    title: `${params.groupName} — round settled`,
    body: `Result: ${params.wonCount}W ${params.lostCount}L. See how your syndicate did.`,
  };
}
