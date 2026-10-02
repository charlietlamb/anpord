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
        Option.some("https://sphynx.test/evals/batch_1")
      )
    ).toEqual([
      "  ✓ completes  codex/luna@autumn-setup  41.2s",
      "  ○ refunds    codex/luna@autumn-setup  2.1s",
      "    void · The prepare step seeds-orders exited with status 3",
      "  ○ retries    codex/luna@autumn-setup  5m00s",
      "    timed out · The agent ran past its time limit of 5m",
      "",
      "  Suite    checkout (checkout.eval.ts)",
      "  Trials   1 timed out | 1 void | 1 passed (3)",
      "  Results  https://sphynx.test/evals/batch_1",
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
      "  ✓ writes #1  codex/luna@autumn-setup  900ms",
      "  ✗ writes #2  codex/luna@autumn-setup  800ms",
      "",
      "  Suite    smoke",
      "  Trials   1 failed | 1 passed (2)",
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
        Option.some("https://sphynx.test/evals/batch_1")
      )
    ).toEqual([
      "  ✓ writes  codex/luna@autumn-setup  900ms",
      "",
      "  Suite    smoke",
      "  Trials   1 passed (1)",
      "  Usage    26k tokens (25k in, 1k out), $0.45 est.",
      "           model $0.42, simulated user $0.03",
      "  Results  https://sphynx.test/evals/batch_1",
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
