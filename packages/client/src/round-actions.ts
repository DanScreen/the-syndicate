import type { RoundMessageDto } from "@tiki-acca/shared";
import type { ApiFetcher } from "./api";

/** Bet-tab mutations shared by web and mobile. Each rejects with ApiError on failure. */

/** Open another concurrent bet (groups with maxActiveBets > 1). */
export function createRound(fetcher: ApiFetcher, groupId: string) {
  return fetcher<{ round: { id: string } }>(
    `/api/groups/${encodeURIComponent(groupId)}/rounds`,
    { method: "POST" }
  );
}

/** Lock a solo acca early. */
export function lockRound(fetcher: ApiFetcher, roundId: string) {
  return fetcher<unknown>(`/api/rounds/${encodeURIComponent(roundId)}/lock`, {
    method: "POST",
  });
}

/** Remove your own leg while the bet is open. */
export function removeLeg(fetcher: ApiFetcher, legId: string) {
  return fetcher<unknown>(`/api/legs/${encodeURIComponent(legId)}`, { method: "DELETE" });
}

/** Toggle an emoji reaction; resolves with the updated message. */
export async function toggleReaction(fetcher: ApiFetcher, messageId: string, emoji: string) {
  const json = await fetcher<{ message: RoundMessageDto }>(
    `/api/messages/${encodeURIComponent(messageId)}/reactions`,
    { method: "POST", body: { emoji } }
  );
  return json.message;
}
