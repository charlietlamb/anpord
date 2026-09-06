import { expect, test } from "bun:test";
import { EvalJudge } from "@anpord/schema/domain/eval-judges";
import { Effect, Layer, Schema } from "effect";
import { HarnessesLive } from "../../src/adapters/harness/resolve";
import { connectionNotFound } from "../../src/credentials/errors";
import { CredentialResolver } from "../../src/credentials/resolver";
import { makeAgentJudge } from "../../src/judges/agent";
import { evaluateJudge } from "../../src/judges/evaluate";
import { JudgeModel } from "../../src/judges/model";
import { EvalSandboxLive } from "../../src/layer";
import { HarnessVersionsLive } from "../../src/services/harness-versions";
import { codexCredential, hasCodex, hasE2b } from "../fixtures/credentials";

const enabled = process.env.EVAL_LIVE_JUDGES === "1" && hasCodex && hasE2b;
const layer = Layer.effect(
  JudgeModel,
  Effect.map(makeAgentJudge, (complete) => ({ complete }))
).pipe(
  Layer.provide(HarnessesLive),
  Layer.provide(HarnessVersionsLive),
  Layer.provide(EvalSandboxLive),
  Layer.provide(
    Layer.succeed(CredentialResolver, {
      resolve: () => Effect.fail(connectionNotFound()),
      resolveBound: () => Effect.fail(connectionNotFound()),
    })
  )
);

test.skipIf(!enabled)(
  "a real Codex judge scores positive and negative controls in isolated E2B sandboxes",
  async () => {
    const judge = Schema.decodeUnknownSync(EvalJudge)({
      kind: "judge",
      name: "arithmetic",
      harness: "codex",
      model: process.env.EVAL_JUDGE_MODEL ?? "gpt-5.6-sol",
      rubric:
        "The answer must give the correct value of 2 + 2. Select correct only for 4, otherwise incorrect.",
      expected: "4",
      choices: { correct: 1, incorrect: 0 },
      timeoutMs: 180_000,
    });
    for (const [output, score] of [
      ["4", 1],
      ["5", 0],
    ] as const) {
      const result = await Effect.runPromise(
        evaluateJudge({
          judge,
          input: "What is 2 + 2?",
          output,
          context: {
            organizationId: "judge-integration",
            harnessCredential: codexCredential,
            provider: "e2b",
          },
        }).pipe(Effect.provide(layer))
      );
      console.log({
        model: result.model,
        score: result.score,
        reason: result.reason,
        error: result.error,
        durationMs: result.durationMs,
      });
      expect(result.error).toBeNull();
      expect(result.score).toBe(score);
    }
  },
  400_000
);
