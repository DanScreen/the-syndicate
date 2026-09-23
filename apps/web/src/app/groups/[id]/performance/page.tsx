import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

/** Former group Performance tab — content lives under Leaderboard. */
export default async function GroupPerformanceRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/groups/${id}/leaderboard`);
}
