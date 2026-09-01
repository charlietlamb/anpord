import { describe, expect, test } from "bun:test";
import type { EvalRun } from "@anpord/schema/domain/evals";
import { gridOf } from "../../src/cli/eval-grid";

const COLOUR = new RegExp(`${String.fromCharCode(27)}\\[\\d+m`, "g");

const bare = (text: string) => text.replaceAll(COLOUR, "");

const cell = (
  caseName: string,
  taskIndex: number,
  status: string,
  settled: number,
  passRate: number | null
) =>
  ({
    caseName,
    distribution: passRate === null ? null : { passRate, scored: settled },
    status,
    taskIndex,
    trials: Array.from({ length: settled }, () => ({ status: "passed" })),
  }) as never;

const run = {
  cases: ["adds a test"],
  cells: [
    cell("adds a test", 0, "finished", 3, 1),
    cell("adds a test", 1, "running", 1, null),
  ],
  tasks: [
    { harness: "codex", model: "gpt-5.6-sol" },
    { harness: "claude", model: "opus" },
  ],
} as unknown as EvalRun;

describe("the grid a reader watches", () => {
  test("groups cells under the case they belong to", () => {
    const lines = gridOf(run, 3, 0).map(bare);

    expect(lines[0]).toContain("adds a test");
    expect(lines[1]).toContain("codex/gpt-5.6-sol");
    expect(lines[2]).toContain("claude/opus");
  });

  test("shows a settled pass rate, and an unscored cell as absent", () => {
    const [, settled, running] = gridOf(run, 3, 0).map(bare);

    expect(settled).toContain("100%");
    expect(running).toContain("\u2014");
  });

  test("fills one pip per settled trial", () => {
    const [, settled, running] = gridOf(run, 3, 0).map(bare);

    expect(settled).toContain("\u25b0\u25b0\u25b0");
    expect(running).toContain("\u25b0\u25b1\u25b1");
  });

  test("reads elapsed time in minutes once there are minutes", () => {
    expect(bare(gridOf(run, 3, 45_000).at(-1) ?? "")).toContain("45s");
    expect(bare(gridOf(run, 3, 134_000).at(-1) ?? "")).toContain("2m14s");
  });
});
