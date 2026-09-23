import { consumePendingInviteCode } from "@/lib/pending-invite";
import { router } from "expo-router";

/**
 * After sign-in / sign-up — honour a pending invite deep link if present.
 * Unverified users go to the verify screen first and the invite stays pending
 * until (main)/_layout picks it up after they confirm.
 */
export function redirectAfterAuth(user?: { emailVerified?: boolean } | null) {
  if (user?.emailVerified === false) {
    router.replace("/verify-email");
    return;
  }
  const code = consumePendingInviteCode();
  if (code) {
    router.replace(`/(main)/join-group?code=${encodeURIComponent(code)}`);
    return;
  }
  router.replace("/(main)/home");
}
