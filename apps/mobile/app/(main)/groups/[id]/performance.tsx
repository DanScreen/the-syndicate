import { Redirect, useLocalSearchParams } from "expo-router";

/** Former group Performance tab — content lives under Leaderboard. */
export default function GroupPerformanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <Redirect href={`/(main)/groups/${id}/leaderboard`} />;
}
