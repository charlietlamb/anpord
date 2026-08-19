import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { Effect, Layer, Option } from "effect";
import { CodexRunnerLive } from "../../src/harness/codex";
import { EvalSandboxLive } from "../../src/layer";
import { AgentTrial, AgentTrialLive } from "../../src/services/agent-trial";

const SCRATCH =
  "/private/tmp/claude-501/-Users-charlielamb-Documents-anpord/12b411dd-d640-4169-a77f-0b9be144cdbd/scratchpad";

const read = (path: string) => {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return;
  }
};

process.env.DAYTONA_API_KEY ??= read(`${SCRATCH}/daytona.key`);
const CREDENTIALS = read(`${homedir()}/.codex/auth.json`);
const READY = Boolean(process.env.DAYTONA_API_KEY && CREDENTIALS);

const TestLayer = AgentTrialLive.pipe(
  Layer.provide(CodexRunnerLive),
  Layer.provideMerge(EvalSandboxLive)
);

describe.if(READY)("an agent trial against a real harness and provider", () => {
  /* The whole product in one test: an agent is given a broken repository, it
     works inside a sandbox, and the verdict comes from running the verifier
     ourselves rather than from what the agent said it achieved. */
  it("lets Codex fix a broken task and scores it from ground truth", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const trial = yield* AgentTrial;
        return yield* trial.run({
          autoStopMinutes: 15,
          credentials: CREDENTIALS ?? "",
          files: {
            "calc.py": "def total(items):\n    return sum(items) - 1\n",
            "test_calc.py":
              "from calc import total\n\n\ndef test_total():\n    assert total([1, 2, 3]) == 6\n",
          },
          harness: "codex",
          harnessVersion: "0.144.4",
          home: "/home/daytona",
          model: "gpt-5.2",
          prompt: "the test fails, fix calc.py so it passes",
          provider: "daytona",
          setupCommand: "python3 -m pip install --quiet pytest 2>&1 | tail -1",
          verifyCommand: "python3 -m pytest -q",
          workspace: "/tmp/anpord-task",
        });
      }).pipe(Effect.provide(TestLayer))
    );

    expect(result.outcome.status).toBe("passed");
    expect(result.outcome.passed).toBe(true);
    expect(result.outcome.voidFields).toEqual([]);

    /* The columns an eval platform reading a tool-call string cannot have. */
    expect(result.commands).toBeGreaterThan(0);
    expect(result.filesChanged.length).toBeGreaterThan(0);
    expect(Option.isSome(result.usage)).toBe(true);

    /* Model time is separated from sandbox time, or a slow provider reads as
         a slow model and the third axis becomes unreadable. */
    expect(result.outcome.modelMs).toBeGreaterThan(0);
    expect(result.outcome.sandboxMs).toBeGreaterThan(0);
  }, 900_000);
});
