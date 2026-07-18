import { GamblingFooter } from "@/components/site-footer";
import { SessionAwareMarketingHeader } from "./session-aware-marketing-header";

export function MarketingShell({
  children,
}: {
  children: React.ReactNode;
  /** Retained for call-site readability; global tracking uses the router path. */
  path?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SessionAwareMarketingHeader />
      <main className="flex-1">{children}</main>
      <GamblingFooter />
    </div>
  );
}
