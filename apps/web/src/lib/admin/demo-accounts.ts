/**
 * Marketing / App Store reviewer accounts from `tools/marketing/seeds/demo-seed.ts`
 * and the video ad cast from `tools/marketing/seeds/video-ad-seed.ts`
 * (`cage.*@demo.tikiacca.com`). Keep in sync with those seeds (email domain + invite code).
 */
export const DEMO_EMAIL_DOMAIN = "demo.tikiacca.com";
export const DEMO_GROUP_INVITE_CODE = "DEMO24";

export function isDemoAccountEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}

/** True when the group is the seeded marketing demo ("The Thursday Club"). */
export function isDemoGroup(opts: {
  inviteCode?: string | null;
  ownerEmail?: string | null;
}): boolean {
  if (
    opts.inviteCode &&
    opts.inviteCode.toUpperCase() === DEMO_GROUP_INVITE_CODE
  ) {
    return true;
  }
  if (opts.ownerEmail && isDemoAccountEmail(opts.ownerEmail)) {
    return true;
  }
  return false;
}
