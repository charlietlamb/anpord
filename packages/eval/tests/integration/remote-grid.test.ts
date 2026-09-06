import { describe, expect, test } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Clock, Duration, Effect, Layer, Option, Redacted } from "effect";
import { SourceTokensNone } from "../../src/codebase/source-token";
import { GridRun, GridRunLive } from "../../src/grid/run";
import { EvalRepositoriesLive } from "../../src/layer";
import { ModelPrices } from "../../src/ports/model-source";
import { TrialRunner } from "../../src/ports/trial-runner";
import { RunRepository } from "../../src/repositories/run-repository";
import { AgentTrial } from "../../src/services/agent-trial";
import { BaselinesLive } from "../../src/services/baselines";
import { skipWithoutDatabase } from "../fixtures/database";

const TestLayer = GridRunLive.pipe(
  Layer.provide(BaselinesLive),
  Layer.provideMerge(EvalRepositoriesLive),
  Layer.provide(SourceTokensNone),
  Layer.provide(
    Layer.succeed(AgentTrial, {
      run: () => Effect.dieMessage("The dispatcher must not execute trials"),
    })
  ),
  Layer.provide(
    Layer.succeed(ModelPrices, { forModel: () => Effect.succeedNone })
  ),
  Layer.provide(Layer.succeed(TrialRunner, { dispatch: () => Effect.void })),
  Layer.provide(IdGeneratorLive),
  Layer.provideMerge(DatabaseLive),
  Layer.provide(
    Layer.succeed(DatabaseConfig, {
      poolMax: 2,
      statementTimeout: Duration.seconds(10),
      url: Redacted.make(process.env.EVAL_TEST_DATABASE_URL ?? ""),
    })
  )
);

describe.skipIf(skipWithoutDatabase())("remote grid reads", () => {
  test("the dispatcher reads worker completion from storage", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const db = yield* Database;
        const grid = yield* GridRun;
        const runs = yield* RunRepository;
        const now = yield* Clock.currentTimeMillis;
        const organizationId = `org_remote_${now}`;

        yield* Effect.promise(() =>
          db.insert(organization).values({
            id: organizationId,
            name: "remote-grid",
            slug: organizationId,
            createdAt: new Date(now),
          })
        );

        const id = yield* grid.start({
          cases: [
            {
              name: "fixture",
              prepare: null,
              source: { kind: "empty" },
              variables: {},
              verify: null,
            },
          ],
          name: "remote-grid",
          organizationId,
          prompt: "Use the fixture",
          startedBy: null,
          tasks: [
            {
              credentials: {
                harness: Redacted.make({
                  authMethodId: "test",
                  connectionId: "test",
                  integrationId: "codex",
                  revision: 1,
                  values: {},
                }),
              },
              harness: "codex",
              harnessVersion: "test",
              model: "test",
              profile: null,
              provider: "e2b",
            },
          ],
          trials: 1,
        });

        const read = () =>
          grid.get(organizationId, id).pipe(Effect.map(Option.getOrThrow));
        const running = yield* read();
        expect(running.status).toBe("running");
        expect(running.cells[0]?.internalId).toBeString();

        const row = Option.getOrThrow(yield* runs.findById(organizationId, id));
        yield* runs.finish({
          internalId: row.internalId,
          status: "finished",
          failure: null,
          finishedAt: new Date(now + 1),
        });

        expect((yield* read()).status).toBe("finished");
        const page = yield* grid.list({
          organizationId,
          cursor: null,
          limit: 1,
        });
        expect(page.runs[0]?.status).toBe("finished");
        expect(page.total).toBe(1);
        expect(yield* grid.get("another-org", id)).toEqual(Option.none());
      }).pipe(Effect.provide(TestLayer))
    );
  });
});
