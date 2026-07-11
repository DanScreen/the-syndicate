"use client";

import {
  AccaSummary,
  LegsList,
  RoundHistory,
  RoundProgress,
  SettleRoundForm,
  SubmitLegForm,
} from "@/components/group-ui";
import { useGroupData } from "@/context/group-data";
import { useSession } from "next-auth/react";

export default function GroupRoundPage() {
  const { data: session } = useSession();
  const { data, reload } = useGroupData();

  if (!data?.activeRound) return null;

  const userId = session?.user?.id;
  const { activeRound, group, isOwner, betslipLink, betslipLinks } = data;
  const hasSubmitted = activeRound.legs.some((l) => l.user.id === userId);

  const isLocked = activeRound.status === "locked";
  const isCollecting = activeRound.status === "collecting";
  const resolvedLegs = activeRound.legs.filter((l) => l.outcome !== "pending").length;
  const lockedBookmakerName =
    activeRound.accaBookmakerRankings?.find(
      (r) => r.bookmakerId === activeRound.bestBookmakerId
    )?.bookmakerName ?? activeRound.legs[0]?.bookmakerName;

  let lockedBanner = "Acca locked — place your bet at the bookmaker";
  if (resolvedLegs > 0 && resolvedLegs < activeRound.legs.length) {
    lockedBanner = `Acca in progress — ${resolvedLegs} of ${activeRound.legs.length} legs settled`;
  } else if (resolvedLegs === activeRound.legs.length && activeRound.legs.length > 0) {
    lockedBanner = "All legs settled — acca will finalize shortly";
  }

  return (
    <div className="space-y-6">
      {isCollecting && (
        <RoundProgress
          members={group.members}
          legs={activeRound.legs}
          status={activeRound.status}
        />
      )}

      {isLocked && (
        <div className="rounded-lg border border-accent/30 bg-accent-muted/40 px-4 py-3 text-sm text-accent">
          {lockedBanner}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold">Picks</h2>
        <div className="mt-3">
          <LegsList
            legs={activeRound.legs}
            legLinks={betslipLinks?.legLinks}
            showOpenLinks={isLocked && resolvedLegs === 0}
            inProgress={isLocked}
          />
        </div>
      </section>

      {isLocked && activeRound.combinedOdds && (
        <AccaSummary
          combinedOdds={activeRound.combinedOdds}
          bookmakerId={activeRound.bestBookmakerId}
          bookmakerName={lockedBookmakerName}
          singleBookmaker={Boolean(activeRound.bestBookmakerId)}
          bookmakerRankings={activeRound.accaBookmakerRankings ?? []}
          betslipLink={resolvedLegs === 0 ? betslipLink : null}
          showBookmakerCompare={resolvedLegs === 0}
          inProgress
        />
      )}

      {isCollecting && userId && !hasSubmitted && (
        <SubmitLegForm roundId={activeRound.id} onSubmitted={reload} />
      )}

      {isLocked && isOwner && (
        <SettleRoundForm round={activeRound} onSettled={reload} />
      )}

      <RoundHistory rounds={data.recentRounds} />
    </div>
  );
}
