import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

/** Former group History tab — settled bets now load on the Bet tab. */
export default async function GroupHistoryRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/groups/${id}`);
}
