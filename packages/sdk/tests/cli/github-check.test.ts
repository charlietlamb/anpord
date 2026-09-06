import { describe, expect, test } from "bun:test";
import { problemsWith } from "../../src/cli/eval-gate";
import type { EvalOutcome } from "../../src/cli/eval-outcome";
import { buildGithubCheck, SUMMARY_LIMIT } from "../../src/cli/github-check";
import {
  createCell,
  createComparison,
  createRun,
  createTrial,
} from "../fixtures/eval-run";

const WEB = "https://anpord.test";
const outcome = (run = createRun()): EvalOutcome => ({
  file: "smoke.eval.ts",
  problems: problemsWith(run, "strict"),
  run,
  runId: run.id,
});

describe("GitHub reporting", () => {
  test("passes the same gate without requiring a baseline", () => {
    const check = buildGithubCheck([outcome()], WEB);
    expect(check.conclusion).toBe("success");
    expect(check.details_url).toBe(`${WEB}/evals/run_fixture`);
    expect(check.output.summary).toContain(
      "| fixture | codex/test | 100% | - | - |"
    );
  });

  test("failed trials fail both the gate and check", () => {
    const result = outcome(
      createRun({
        cells: [
          createCell({
            trials: [createTrial({ status: "failed", passed: false })],
          }),
        ],
      })
    );
    expect(result.problems).not.toBeEmpty();
    expect(buildGithubCheck([result], WEB).conclusion).toBe("failure");
  });

  test("does not recalculate the chosen gate", () => {
    const result = outcome(
      createRun({
        cells: [
          createCell({
            comparison: createComparison({ verdict: "regressed" }),
          }),
        ],
      })
    );
    expect(
      buildGithubCheck([{ ...result, problems: [] }], WEB).conclusion
    ).toBe("success");
    expect(
      buildGithubCheck([{ ...result, problems: ["regressed"] }], WEB).conclusion
    ).toBe("failure");
  });

  test("reports failures before a result exists and preserves its link", () => {
    const result: EvalOutcome = {
      file: "timeout.eval.ts",
      run: null,
      runId: "run_timeout",
      problems: ["Timed out"],
    };
    const check = buildGithubCheck([result], WEB);
    expect(check.conclusion).toBe("failure");
    expect(check.output.summary).toContain("Timed out");
    expect(check.output.summary).toContain(`${WEB}/evals/run_timeout`);
  });

  test("links every run, not just the first", () => {
    const check = buildGithubCheck(
      [outcome(), outcome(createRun({ id: "run_second" }))],
      WEB
    );
    expect(check.output.summary).toContain(`${WEB}/evals/run_fixture`);
    expect(check.output.summary).toContain(`${WEB}/evals/run_second`);
  });

  test("names changed harness versions", () => {
    const result = outcome(
      createRun({
        cells: [
          createCell({
            comparison: createComparison({ candidateHarnessVersion: "2.0.0" }),
          }),
        ],
      })
    );
    expect(buildGithubCheck([result], WEB).output.summary).toContain(
      "codex 1.0.0 → 2.0.0"
    );
  });

  test("escapes repository text and limits the summary", () => {
    const result = outcome(
      createRun({
        cells: Array.from({ length: 2000 }, () =>
          createCell({ caseName: `<script>\n| ${"x".repeat(60)}` })
        ),
      })
    );
    const summary = buildGithubCheck([result], WEB).output.summary;
    expect(summary).not.toContain("<script>");
    expect(summary.length).toBeLessThan(SUMMARY_LIMIT);
    expect(summary).toEndWith("truncated");
  });
});
