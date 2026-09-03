import { describe, expect, test } from "bun:test";
import type { EvalRun } from "@anpord/schema/domain/evals";
import { Option } from "effect";
import type { EvalOutcome } from "../../src/cli/eval-outcome";
import { checkRunOf, SUMMARY_LIMIT } from "../../src/cli/github-check";

const cell = (
  caseName: string,
  taskIndex: number,
  passRate: number | null,
  comparison: Record<string, unknown> | null
) =>
  ({
    caseName,
    comparison:
      comparison === null
        ? null
        : { baselinePassRate: 1, candidatePassRate: passRate, ...comparison },
    distribution: passRate === null ? null : { passRate, scored: 3 },
    taskIndex,
  }) as never;

const runWith = (id: string, cells: readonly unknown[]) =>
  ({
    cells,
    failure: null,
    id,
    tasks: [
      { harness: "codex", model: "gpt-5.6-sol" },
      { harness: "claude", model: "opus" },
    ],
  }) as unknown as EvalRun;

const outcome = (file: string, run: EvalRun | null): EvalOutcome => ({
  file,
  problems: [],
  run: run === null ? Option.none() : Option.some(run),
});

const WEB = "https://anpord.test";

describe("the check a pull request shows", () => {
  test("any regression concludes failure, and the table names it", () => {
    const check = checkRunOf(
      [
        outcome(
          "smoke.eval.ts",
          runWith("run_1", [
            cell("adds a test", 0, 1, { verdict: "unchanged" }),
            cell("adds a test", 1, 0.5, { verdict: "regressed" }),
            cell("renames", 0, null, null),
          ])
        ),
      ],
      WEB
    );

    expect(check.conclusion).toBe("failure");
    expect(check.name).toBe("anpord");
    expect(check.details_url).toBe(`${WEB}/evals/run_1`);
    expect(check.output.summary).toContain("### smoke.eval.ts");
    expect(check.output.summary).toContain(
      "| adds a test | codex/gpt-5.6-sol | 100% | 100% | unchanged |"
    );
    expect(check.output.summary).toContain(
      "| adds a test | claude/opus | 50% | 100% | regressed |"
    );
    expect(check.output.summary).toContain(
      "| renames | codex/gpt-5.6-sol | — | — | — |"
    );
  });

  test("a grid with nothing to compare is neutral", () => {
    const check = checkRunOf(
      [
        outcome(
          "a.eval.ts",
          runWith("run_1", [
            cell("a", 0, 1, { verdict: "incomparable" }),
            cell("b", 0, 1, null),
          ])
        ),
      ],
      WEB
    );

    expect(check.conclusion).toBe("neutral");
  });

  test("a comparable grid without a regression succeeds", () => {
    const check = checkRunOf(
      [
        outcome(
          "a.eval.ts",
          runWith("run_1", [
            cell("a", 0, 1, { verdict: "improved" }),
            cell("b", 0, 1, { verdict: "incomparable" }),
          ])
        ),
      ],
      WEB
    );

    expect(check.conclusion).toBe("success");
  });

  test("names the harness versions only when they differ", () => {
    const check = checkRunOf(
      [
        outcome(
          "a.eval.ts",
          runWith("run_1", [
            cell("a", 0, 0.5, {
              baselineHarnessVersion: "1.2.0",
              candidateHarnessVersion: "1.3.0",
              verdict: "regressed",
            }),
            cell("b", 1, 1, {
              baselineHarnessVersion: "2.0.0",
              candidateHarnessVersion: "2.0.0",
              verdict: "unchanged",
            }),
          ])
        ),
      ],
      WEB
    );

    expect(check.output.summary).toContain("regressed (codex 1.2.0 → 1.3.0) |");
    expect(check.output.summary).toContain("| unchanged |");
    expect(check.output.summary).not.toContain("2.0.0");
  });

  test("one table per finished run, linking to the first", () => {
    const check = checkRunOf(
      [
        outcome("skipped.eval.ts", null),
        outcome("first.eval.ts", runWith("run_1", [])),
        outcome("second.eval.ts", runWith("run_2", [])),
      ],
      WEB
    );

    expect(check.details_url).toBe(`${WEB}/evals/run_1`);
    expect(check.output.summary).not.toContain("skipped.eval.ts");
    expect(check.output.summary).toContain("### first.eval.ts");
    expect(check.output.summary).toContain("### second.eval.ts");
  });

  test("keeps the summary under what GitHub accepts", () => {
    const many = Array.from({ length: 2000 }, (_, index) =>
      cell(`case ${index} ${"x".repeat(60)}`, 0, 1, { verdict: "unchanged" })
    );
    const check = checkRunOf(
      [outcome("a.eval.ts", runWith("run_1", many))],
      WEB
    );

    expect(check.output.summary.length).toBeLessThan(SUMMARY_LIMIT);
    expect(check.output.summary).toEndWith("truncated");
  });
});
