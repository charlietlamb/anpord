import { describe, expect, test } from "bun:test";
import type { PromptPlacements } from "@anpord/schema/domain/placements";
import {
  isRollback,
  orderedChanges,
  rollbackCount,
  stage,
  stagedKey,
  stageRowToLatest,
  unstage,
} from "./staged-changes";

const change = (
  promptId: string,
  channel: string,
  from: number | null,
  to: number
) => ({ channel, from, promptId, promptName: promptId, to });

const empty = new Map();

const prompt = (
  placements: readonly { channel: string; version: number }[],
  latestVersion: number | null = 5
) =>
  ({
    id: "greeting",
    latestVersion,
    name: "Greeting",
    placements: placements.map((row) => ({
      channel: row.channel,
      updatedAt: new Date(0),
      updatedBy: null,
      version: row.version,
    })),
  }) as unknown as PromptPlacements;

describe("stage", () => {
  test("records a move", () => {
    const staged = stage(empty, change("greeting", "production", 1, 2));

    expect(staged.get(stagedKey("greeting", "production"))?.to).toBe(2);
  });

  /** Picking the version already served is how someone undoes a staged change
   * without a separate control, so it has to clear rather than record a move
   * from a version to itself. */
  test("clears rather than staging a move to the served version", () => {
    const staged = stage(empty, change("greeting", "production", 2, 2));

    expect(staged.size).toBe(0);
  });

  test("replaces an earlier change to the same channel", () => {
    const first = stage(empty, change("greeting", "production", 1, 2));
    const second = stage(first, change("greeting", "production", 1, 4));

    expect(second.size).toBe(1);
    expect(second.get(stagedKey("greeting", "production"))?.to).toBe(4);
  });

  test("keeps changes to different channels apart", () => {
    const first = stage(empty, change("greeting", "production", 1, 2));
    const second = stage(first, change("greeting", "staging", 1, 2));

    expect(second.size).toBe(2);
  });
});

describe("unstage", () => {
  test("drops one change and leaves the rest", () => {
    const staged = stage(
      stage(empty, change("greeting", "production", 1, 2)),
      change("greeting", "staging", 1, 2)
    );

    expect(unstage(staged, "greeting", "production").size).toBe(1);
  });
});

describe("isRollback", () => {
  test("names a move to a lower version", () => {
    expect(isRollback(change("greeting", "production", 7, 5))).toBe(true);
  });

  test("does not name a move forward", () => {
    expect(isRollback(change("greeting", "production", 5, 7))).toBe(false);
  });

  /** A channel that served nothing cannot roll back: there is no version to
   * return to, only a first one to start serving. */
  test("does not name a first deployment", () => {
    expect(isRollback(change("greeting", "production", null, 1))).toBe(false);
  });
});

describe("stageRowToLatest", () => {
  test("moves every channel the prompt already serves", () => {
    const staged = stageRowToLatest(
      empty,
      prompt([
        { channel: "production", version: 1 },
        { channel: "staging", version: 3 },
      ])
    );

    expect(staged.size).toBe(2);
    expect([...staged.values()].every((row) => row.to === 5)).toBe(true);
  });

  /** Not being set is a decision nobody has made yet. Catching a prompt up
   * must never start serving a channel that served nothing. */
  test("leaves channels the prompt has never used alone", () => {
    const staged = stageRowToLatest(empty, prompt([]));

    expect(staged.size).toBe(0);
  });

  test("stages nothing for a prompt with no versions", () => {
    const staged = stageRowToLatest(
      empty,
      prompt([{ channel: "production", version: 1 }], null)
    );

    expect(staged.size).toBe(0);
  });

  test("skips a channel already serving the newest version", () => {
    const staged = stageRowToLatest(
      empty,
      prompt([
        { channel: "production", version: 5 },
        { channel: "staging", version: 2 },
      ])
    );

    expect(staged.size).toBe(1);
    expect(staged.get(stagedKey("greeting", "staging"))?.to).toBe(5);
  });
});

describe("rollbackCount", () => {
  test("counts only the moves that go backwards", () => {
    const staged = stage(
      stage(empty, change("greeting", "production", 7, 5)),
      change("greeting", "staging", 1, 4)
    );

    expect(rollbackCount(staged)).toBe(1);
  });
});

describe("orderedChanges", () => {
  /** The review is read top down, and what moves backwards is what the reader
   * has to see first. */
  test("puts rollbacks first", () => {
    const staged = stage(
      stage(empty, change("alpha", "production", 1, 4)),
      change("zulu", "production", 7, 5)
    );

    expect(orderedChanges(staged).map((row) => row.promptId)).toEqual([
      "zulu",
      "alpha",
    ]);
  });

  test("orders the rest by prompt then channel", () => {
    const staged = stage(
      stage(empty, change("beta", "staging", 1, 2)),
      change("alpha", "production", 1, 2)
    );

    expect(orderedChanges(staged).map((row) => row.promptId)).toEqual([
      "alpha",
      "beta",
    ]);
  });
});
