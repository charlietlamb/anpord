import { expect, test } from "bun:test";
import { validationExecution } from "@sphynx/schema/domain/eval-validations";
import type { TrialOutcome } from "@sphynx/schema/domain/trial";
import { Effect, Layer, Stream } from "effect";
import { ScorerChecksLive } from "../../../src/adapters/scorers/checks";
import { Scorer } from "../../../src/ports/scorer";
import { declinesEverything } from "../../fixtures/declines-everything";

const verdicts: Record<string, TrialOutcome["status"]> = {
  broken: "void",
  failing: "failed",
  passing: "passed",
};

const groupScorer = Layer.succeed(
  Scorer,
  Scorer.of({
    score: (request) =>
      Effect.sync(() => {
        const name = request.validator?.name ?? "";
        const status = verdicts[name] ?? "void";
        return {
          artifacts: [],
          commandCount: 0,
          exitCode: status === "passed" ? 0 : 1,
          modelMs: 0,
          sandboxMs: 0,
          status,
          validations: [
            {
              ...validationExecution(
                {
                  id: `${request.validationPrefix ?? ""}code:0`,
                  index: 0,
                  name,
                  kind: "code",
                },
                0
              ),
              status: status === "void" ? "error" : status,
            },
          ],
          verifySteps: [],
          voidFields: status === "void" ? ["validator"] : [],
        };
      }),
  })
);

const scoreGroups = (names: readonly string[]) =>
  Effect.runPromise(
    Effect.flatMap(Scorer, (scorer) =>
      scorer.score({
        commandCount: 0,
        events: [],
        modelMs: 0,
        turns: [],
        verifyCommand: null,
        workspace: "/tmp",
        sandbox: {
          ...declinesEverything,
          exec: () => Stream.empty,
          home: "/tmp",
          id: "checks",
          provider: "local",
          writeFile: () => Effect.void,
        },
        validator: {
          kind: "judged",
          name: "groups",
          checks: names.map((name) => ({ name, source: "export {}" })),
          judges: [],
        },
      })
    ).pipe(Effect.provide(ScorerChecksLive.pipe(Layer.provide(groupScorer))))
  );

const summary = (outcome: TrialOutcome) => ({
  status: outcome.status,
  validations: outcome.validations.map((record) => [
    record.id,
    record.name,
    record.status,
  ]),
  voidFields: outcome.voidFields,
});

test("scores every code group after one fails", async () => {
  expect(summary(await scoreGroups(["failing", "passing"]))).toEqual({
    status: "failed",
    validations: [
      ["group:0:code:0", "failing", "failed"],
      ["group:1:code:0", "passing", "passed"],
    ],
    voidFields: [],
  });
});

test("an invalid group voids the trial and still scores the rest", async () => {
  expect(summary(await scoreGroups(["broken", "failing", "passing"]))).toEqual({
    status: "void",
    validations: [
      ["group:0:code:0", "broken", "error"],
      ["group:1:code:0", "failing", "failed"],
      ["group:2:code:0", "passing", "passed"],
    ],
    voidFields: ["validator"],
  });
});

test("passes only when every group passes", async () => {
  expect(summary(await scoreGroups(["passing", "passing"])).status).toBe(
    "passed"
  );
});
