import { describe, expect, test } from "bun:test";
import { problemsWith } from "../../src/cli/eval-gate";
import { buildGithubCheck, SUMMARY_LIMIT } from "../../src/cli/github-check";
import type { SuiteOutcome } from "../../src/cli/suite-outcome";
import { createBatch, createRun, createTrial } from "../fixtures/eval-run";

const WEB = "https://anpord.test";
const outcome = (batch = createBatch()): SuiteOutcome => ({
  batch,
  batchId: batch.id,
  error: null,
  file: "smoke.eval.ts",
  suite: "smoke",
  problems: problemsWith(batch, "failures", { runs: 1, trials: 1 }),
});

describe("GitHub reporting", () => {
  test("passes a batch whose trials all passed", () => {
    const check = buildGithubCheck([outcome()], WEB);
    expect(check.conclusion).toBe("success");
    expect(check.details_url).toBe(`${WEB}/evals/batch_fixture`);
    expect(check.output.summary).toContain("| fixture | codex/test | 100% |");
    expect(check.output.summary).toContain("### smoke (smoke.eval.ts)");
  });

  test("failed trials fail both the gate and check", () => {
    const result = outcome(
      createBatch({
        runs: [createRun({ trials: [createTrial({ status: "failed" })] })],
      })
    );
    expect(result.problems).not.toBeEmpty();
    expect(buildGithubCheck([result], WEB).conclusion).toBe("failure");
  });

  test("does not recalculate the chosen gate", () => {
    const result = outcome(
      createBatch({
        runs: [createRun({ trials: [createTrial({ status: "failed" })] })],
      })
    );
    expect(
      buildGithubCheck([{ ...result, problems: [] }], WEB).conclusion
    ).toBe("success");
  });

  test("reports failures before a result exists and preserves its link", () => {
    const result: SuiteOutcome = {
      batch: null,
      batchId: "batch_timeout",
      error: "Timed out",
      file: "timeout.eval.ts",
      problems: [],
      suite: "timeout",
    };
    const check = buildGithubCheck([result], WEB);
    expect(check.conclusion).toBe("failure");
    expect(check.output.summary).toContain("Timed out");
    expect(check.output.summary).toContain(`${WEB}/evals/batch_timeout`);
  });

  test("links every batch, not just the first", () => {
    const check = buildGithubCheck(
      [outcome(), outcome(createBatch({ id: "batch_second" }))],
      WEB
    );
    expect(check.output.summary).toContain(`${WEB}/evals/batch_fixture`);
    expect(check.output.summary).toContain(`${WEB}/evals/batch_second`);
  });

  test("escapes repository text and limits the summary", () => {
    const result = outcome(
      createBatch({
        runs: Array.from({ length: 2000 }, () =>
          createRun({
            case: { id: "fixture", name: `<script>\n| ${"x".repeat(60)}` },
          })
        ),
      })
    );
    const summary = buildGithubCheck([result], WEB).output.summary;
    expect(summary).not.toContain("<script>");
    expect(summary.length).toBeLessThan(SUMMARY_LIMIT);
    expect(summary).toEndWith("truncated");
  });
});
