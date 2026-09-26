import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HistoryRound } from "@tiki-acca/shared";
import { mergeHistoryPages } from "./group-history";

const round = (id: string) => ({ id }) as HistoryRound;

describe("mergeHistoryPages", () => {
  it("keeps the first page's order and drops older rounds it already has", () => {
    const merged = mergeHistoryPages(
      [round("new"), round("a"), round("b")],
      [round("b"), round("c"), round("d")]
    );
    assert.deepEqual(merged.map((r) => r.id), ["new", "a", "b", "c", "d"]);
  });
});
