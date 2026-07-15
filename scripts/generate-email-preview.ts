/**
 * Regenerate scripts/preview-notification-emails.html from live templates.
 *
 *   cd apps/web && npx tsx ../../scripts/generate-email-preview.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EmailDocument } from "../apps/web/src/lib/notifications/email-layout";
import {
  pickReminderEmail,
  roundLockedEmail,
  roundSettledEmail,
} from "../apps/web/src/lib/notifications/templates";

process.env.NEXTAUTH_URL ??= "https://www.tikiacca.com";

const logoPath = resolve(
  import.meta.dirname,
  "../apps/web/public/brand/email-logo.png"
);
const logoDataUri = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;

/** Preview files can't load production URLs until deploy — inline the logo. */
function withLocalLogo(doc: EmailDocument): EmailDocument {
  const logoUrl = `${process.env.NEXTAUTH_URL}/brand/email-logo.png`;
  return {
    ...doc,
    html: doc.html.split(logoUrl).join(logoDataUri),
  };
}

const sampleLegs = [
  {
    memberName: "Alex",
    selectionLabel: "Arsenal",
    marketLabel: "Match winner",
    odds: 1.85,
  },
  {
    memberName: "Sam",
    selectionLabel: "Over 2.5",
    marketLabel: "Totals",
    odds: 1.9,
  },
  {
    memberName: "Jordan",
    selectionLabel: "BTTS Yes",
    marketLabel: "Both teams to score",
    odds: 1.72,
  },
] as const;

const reminder = withLocalLogo(
  pickReminderEmail({
    groupName: "Dog & Duck FC",
    deadline: new Date("2026-07-18T14:00:00Z"),
    pendingCount: 2,
    groupUrl: "https://www.tikiacca.com/groups/demo",
  })
);

const lockedFull = withLocalLogo(
  roundLockedEmail({
    groupName: "Dog & Duck FC",
    combinedOdds: "8.42",
    missingCount: 0,
    groupUrl: "https://www.tikiacca.com/groups/demo",
    legs: [...sampleLegs],
  })
);

const lockedPartial = withLocalLogo(
  roundLockedEmail({
    groupName: "Dog & Duck FC",
    combinedOdds: "8.42",
    missingCount: 1,
    groupUrl: "https://www.tikiacca.com/groups/demo",
    legs: [...sampleLegs],
  })
);

const settled = withLocalLogo(
  roundSettledEmail({
    groupName: "Dog & Duck FC",
    plLabel: "−£10.00",
    wonCount: 2,
    lostCount: 1,
    groupUrl: "https://www.tikiacca.com/groups/demo",
    legs: [
      {
        memberName: "Alex",
        selectionLabel: "Arsenal",
        outcome: "won",
        pointsLabel: "0.85",
      },
      {
        memberName: "Sam",
        selectionLabel: "Over 2.5",
        outcome: "won",
        pointsLabel: "0.9",
      },
      {
        memberName: "Jordan",
        selectionLabel: "BTTS Yes",
        outcome: "lost",
        pointsLabel: "-1",
      },
    ],
  })
);

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function section(title: string, doc: EmailDocument): string {
  const srcdoc = doc.html.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<section>
  <h2>${esc(title)}</h2>
  <div class="meta">Subject: ${esc(doc.subject)}
Preheader: ${esc(doc.preheader)}</div>
  <iframe srcdoc="${srcdoc}"></iframe>
</section>`;
}

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Tiki Acca: email previews</title>
<style>
  body { margin: 0; font-family: Georgia, serif; background: #e8e4dc; color: #1a1a1a; }
  header { padding: 24px 20px 8px; max-width: 960px; margin: 0 auto; }
  h1 { margin: 0 0 8px; font-size: 22px; }
  p { margin: 0 0 20px; color: #444; font-size: 14px; }
  section { max-width: 960px; margin: 0 auto 28px; padding: 0 20px; }
  h2 { font-size: 15px; margin: 0 0 8px; }
  .meta { font-family: ui-monospace, monospace; font-size: 12px; color: #555; margin-bottom: 10px; white-space: pre-wrap; }
  iframe { width: 100%; height: 720px; border: 1px solid #bbb; border-radius: 8px; background: #0b1220; }
</style>
</head>
<body>
<header>
  <h1>Notification email previews</h1>
  <p>Generated from <code>lib/notifications/templates.ts</code>. Logo inlined for local preview. Regenerate: <code>cd apps/web &amp;&amp; npx tsx ../../scripts/generate-email-preview.ts</code></p>
</header>
${section("Pick reminder", reminder)}
${section("Acca locked (everyone in)", lockedFull)}
${section("Acca locked (partial kickoff lock)", lockedPartial)}
${section("Round settled", settled)}
</body>
</html>
`;

const out = resolve(import.meta.dirname, "preview-notification-emails.html");
writeFileSync(out, page);
console.log(`wrote ${out}`);
