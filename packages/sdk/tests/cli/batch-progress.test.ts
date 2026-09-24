import { describe, expect, test } from "bun:test";
import type { EvalBatch } from "@anpord/schema/domain/evals";
import { formatBatch } from "../../src/cli/batch-progress";

const COLOUR = new RegExp(`${String.fromCharCode(27)}\\[\\d+m`, "g");

const bare = (text: string) => text.replaceAll(COLOUR, "");

const run = (
  harness: string,
  model: string,
  status: string,
  settled: number,
  passRate: number | null
) => ({
  case: { id: "adds-a-test", name: "adds a test" },
  distribution: {
    passRate: passRate ?? 0,
    scored: passRate === null ? 0 : settled,
  },
  status,
  trials: Array.from({ length: settled }, () => ({ status: "passed" })),
  variant: { harness, model },
});

const batch = {
  costs: null,
  runs: [
    run("codex", "gpt-5.6-sol", "finished", 3, 1),
    run("claude", "opus", "running", 1, null),
  ],
} as unknown as EvalBatch;

describe("the progress a reader watches", () => {
  test("groups runs under the case they belong to", () => {
    const lines = formatBatch(batch, 3, 0).map(bare);

    expect(lines[0]).toContain("adds a test");
    expect(lines[1]).toContain("codex/gpt-5.6-sol");
    expect(lines[2]).toContain("claude/opus");
  });

  test("shows a settled pass rate, and an unscored run as absent", () => {
    const [, settled, running] = formatBatch(batch, 3, 0).map(bare);

    expect(settled).toContain("100%");
    expect(running).toContain("—");
  });

  test("fills one pip per settled trial", () => {
    const [, settled, running] = formatBatch(batch, 3, 0).map(bare);

    expect(settled).toContain("▰▰▰");
    expect(running).toContain("▰▱▱");
  });

  test("reads elapsed time in minutes once there are minutes", () => {
    expect(bare(formatBatch(batch, 3, 45_000).at(-1) ?? "")).toContain("45s");
    expect(bare(formatBatch(batch, 3, 134_000).at(-1) ?? "")).toContain(
      "2m14s"
    );
  });
});
