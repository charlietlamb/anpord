import { describe, expect, it } from "bun:test";
import { Option } from "effect";
import { localProblems, summaryLines } from "../../src/cli/local-report";
import type { LocalCase } from "../../src/cli/local-trial-result";

const trial = (
  name: string,
  status: LocalCase["status"],
  durationMs: number,
  reason: string | null = null,
  ordinal = 1
): LocalCase => ({
  durationMs,
  name,
  ordinal,
  reason,
  status,
  commands: 1,
  usage: null,
  variant: "codex/luna@autumn-setup",
});

const cases = [
  trial("completes", "passed", 41_200),
  trial(
    "refunds",
    "void",
    2100,
    "The prepare step seeds-orders exited with status 3"
  ),
  trial(
    "retries",
    "timed out",
    300_000,
    "The agent ran past its time limit of 5m"
  ),
];

describe("the summary a local run ends with", () => {
  it("lists every trial with its outcome and the batch link once", () => {
    expect(
      summaryLines(
        "checkout (checkout.eval.ts)",
        cases,
        null,
        Option.some("https://anpord.test/evals/batch_1")
      )
    ).toEqual([
      "checkout (checkout.eval.ts): 3 trials on this machine, 1 passed, 1 void, 1 timed out",
      "  ✓ passed     completes on codex/luna@autumn-setup  41.2s",
      "  ○ void       refunds on codex/luna@autumn-setup    2.1s",
      "               The prepare step seeds-orders exited with status 3",
      "  ○ timed out  retries on codex/luna@autumn-setup    5m00s",
      "               The agent ran past its time limit of 5m",
      "  Results: https://anpord.test/evals/batch_1",
    ]);
  });

  it("numbers trials only when a case ran more than once", () => {
    expect(
      summaryLines(
        "smoke",
        [
          trial("writes", "passed", 900),
          trial("writes", "failed", 800, null, 2),
        ],
        null,
        Option.none()
      )
    ).toEqual([
      "smoke: 2 trials on this machine, 1 passed, 1 failed",
      "  ✓ passed  writes on codex/luna@autumn-setup, trial 1  900ms",
      "  ✗ failed  writes on codex/luna@autumn-setup, trial 2  800ms",
    ]);
  });

  it("prints what the trials cost before the link", () => {
    const part = (component: "model" | "user", usd: number) => ({
      classification: "estimate" as const,
      component,
      detail: {},
      explanation: "",
      source: "aggregate",
      usd,
    });

    expect(
      summaryLines(
        "smoke",
        [
          {
            ...trial("writes", "passed", 900),
            commands: 10,
            usage: {
              cacheReadTokens: 0,
              inputTokens: 25_000,
              outputTokens: 1000,
            },
          },
        ],
        {
          allocatedUsd: 0,
          components: [part("model", 0.42), part("user", 0.03)],
          estimatedEquivalentUsd: 0.45,
          incomplete: false,
          knownActualUsd: 0,
        },
        Option.some("https://anpord.test/evals/batch_1")
      )
    ).toEqual([
      "smoke: 1 trial on this machine, 1 passed",
      "  ✓ passed  writes on codex/luna@autumn-setup  900ms",
      "  26k tokens (25k in, 1k out), $0.45 est.",
      "  model $0.42, simulated user $0.03",
      "  Results: https://anpord.test/evals/batch_1",
    ]);
  });

  it("fails the gate with one line that counts what did not pass", () => {
    expect(localProblems("checkout (checkout.eval.ts)", cases)).toEqual([
      "checkout (checkout.eval.ts): 2 of 3 trials did not pass.",
    ]);
    expect(localProblems("smoke", [trial("writes", "passed", 900)])).toEqual(
      []
    );
  });
});
