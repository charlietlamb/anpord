import { describe, expect, test } from "bun:test";
import { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import { StartedBatch } from "@anpord/schema/domain/evals";
import { Effect, Either, Option, Schema } from "effect";
import { runIdsFor } from "../../src/cli/local-run-ids";
import { createBatch, createRun } from "../fixtures/eval-run";

const request = Schema.decodeUnknownSync(StartBatchRequest)({
  cases: [{ id: "fixture", name: "fixture" }],
  suite: { id: "smoke", name: "smoke", prompt: "Do it" },
  trials: 1,
  variants: [
    { harness: "codex", model: "test" },
    { harness: "claude", model: "opus" },
  ],
});

const variantOf = (harness: "claude" | "codex", model: string, id: string) => ({
  harness,
  id,
  model,
  profile: null,
  sandbox: "e2b" as const,
  userModel: null,
});

const batch = createBatch({
  runs: [
    createRun({ id: "run_claude", variant: variantOf("claude", "opus", "v2") }),
    createRun({ id: "run_codex", variant: variantOf("codex", "test", "v1") }),
  ],
});

const started = {
  id: "batch_fixture",
  runs: [
    { caseId: "fixture", id: "run_codex", variantId: "v1" },
    { caseId: "fixture", id: "run_claude", variantId: "v2" },
  ],
};

describe("matching local trials to the runs a batch holds", () => {
  test("finds each variant's run by case and variant id, not by order", () => {
    const runIdOf = Effect.runSync(
      runIdsFor(request, Schema.decodeUnknownSync(StartedBatch)(started), batch)
    );
    const [codex, claude] = request.variants;
    if (codex === undefined || claude === undefined) {
      throw new Error("Expected two variants");
    }
    expect(runIdOf({ caseId: "fixture", variant: codex })).toBe("run_codex");
    expect(runIdOf({ caseId: "fixture", variant: claude })).toBe("run_claude");
  });

  test("fails, naming the case and variant, when a run is missing", () => {
    const missing = Effect.runSync(
      Effect.either(
        runIdsFor(
          request,
          Schema.decodeUnknownSync(StartedBatch)({
            ...started,
            runs: started.runs.slice(0, 1),
          }),
          batch
        )
      )
    );
    expect(Either.getLeft(missing).pipe(Option.getOrThrow).message).toContain(
      "fixture on claude/opus"
    );
  });
});
