import { auth } from "@/lib/auth";
import { recordAnalyticsEventAsync } from "@/lib/analytics";

export async function PageView({ path }: { path: string }) {
  const session = await auth();
  recordAnalyticsEventAsync({
    type: "page_view",
    path,
    userId: session?.user?.id,
  });
  return null;
}
