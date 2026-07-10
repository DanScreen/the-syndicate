import { GamblingFooter } from "@/components/site-footer";
import { PageView } from "@/components/analytics/page-view";
import { MarketingHeader } from "./marketing-header";

export function MarketingShell({
  children,
  path,
}: {
  children: React.ReactNode;
  path?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {path ? <PageView path={path} /> : null}
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <GamblingFooter />
    </div>
  );
}
