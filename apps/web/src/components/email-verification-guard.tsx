"use client";

import { isProtectedPath, verifyEmailHref } from "@/lib/auth-paths";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Middleware redirects unverified users using the cookie's copy of the flag,
 * which is missing on sessions issued before verification shipped. Once the
 * client session refetch fills it in, this sends them to the gate without
 * waiting for their next full navigation.
 */
export function EmailVerificationGuard() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const unverified = status === "authenticated" && session?.user?.isEmailVerified === false;

  useEffect(() => {
    if (!unverified || !pathname) return;
    if (!isProtectedPath(pathname) && pathname !== "/groups/join") return;
    router.replace(verifyEmailHref(`${pathname}${window.location.search}`));
  }, [unverified, pathname, router]);

  return null;
}
