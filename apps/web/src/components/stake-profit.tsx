"use client";

import { formatLegPoints, formatProfitGbp, profitFromPoints } from "@the-syndicate/shared";
import { useState } from "react";

const DEFAULT_STAKE = 10;

type StakeProfitProps = {
  points: number;
  className?: string;
};

export function StakeProfit({ points, className }: StakeProfitProps) {
  const [stake, setStake] = useState(DEFAULT_STAKE);
  const profit = profitFromPoints(points, stake);

  return (
    <div
      className={`rounded-xl border border-border bg-card/50 p-4 ${className ?? ""}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Convert points to profit
      </p>
      <p className="mt-1 text-sm text-muted">
        {formatLegPoints(points)} pts × your stake per point
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Stake</span>
          <span className="text-muted">£</span>
          <input
            type="number"
            min={1}
            max={10000}
            step={1}
            value={stake}
            onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 tabular-nums"
          />
        </label>
        <span
          className={`text-lg font-semibold tabular-nums ${
            profit >= 0 ? "text-accent" : "text-red-400"
          }`}
        >
          {formatProfitGbp(profit)}
        </span>
      </div>
    </div>
  );
}
