import { recordAnalyticsEventAsync } from "@/lib/analytics";

export function PageView({
  path,
  userId,
}: {
  path: string;
  userId?: string | null;
}) {
  recordAnalyticsEventAsync({
    type: "page_view",
    path,
    userId: userId ?? undefined,
  });
  return null;
}
