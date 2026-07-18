import assert from "node:assert/strict";
import test from "node:test";
import { nextLegIndexForUser } from "@tiki-acca/shared";
import { formatLegRemovedBody } from "./system-messages";

test("a replacement pick reuses the removed leg index", () => {
  const legs = [
    { userId: "user-1", legIndex: 2 },
    { userId: "user-1", legIndex: 3 },
    { userId: "user-2", legIndex: 1 },
  ];

  assert.equal(nextLegIndexForUser(legs, "user-1"), 1);
});

test("leg removal chat copy records the removed selection", () => {
  assert.equal(
    formatLegRemovedBody("Dan", {
      selectionLabel: "Over 2.5",
      homeTeam: "France",
      awayTeam: "England",
    }),
    "Dan removed Over 2.5 (France v England) from the acca 🗑️"
  );
});
