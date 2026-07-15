import { AppHeader } from "@/components/header";
import { GamblingFooter } from "@/components/site-footer";
import { PageView } from "@/components/analytics/page-view";
import { auth } from "@/lib/auth";
import { greetingFirstName } from "@/lib/user-display";
import { MarketingHeader } from "./marketing-header";

export async function MarketingShell({
  children,
  path,
}: {
  children: React.ReactNode;
  path?: string;
}) {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <div className="flex min-h-screen flex-col">
      {path ? (
        <PageView path={path} userId={session?.user?.id ?? undefined} />
      ) : null}
      {signedIn ? (
        <AppHeader userName={greetingFirstName(session?.user ?? {})} />
      ) : (
        <MarketingHeader />
      )}
      <main className="flex-1">{children}</main>
      <GamblingFooter />
    </div>
  );
}
