export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/groups/:path*", "/performance", "/admin/:path*"],
};
