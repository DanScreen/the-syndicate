import { consumePendingInviteCode } from "@/lib/pending-invite";
import { router } from "expo-router";

/** After sign-in / sign-up — honour a pending invite deep link if present. */
export function redirectAfterAuth() {
  const code = consumePendingInviteCode();
  if (code) {
    router.replace(`/(main)/join-group?code=${encodeURIComponent(code)}`);
    return;
  }
  router.replace("/(main)");
}
