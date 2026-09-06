import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { EvalSetup } from "@anpord/schema/domain/evals";
import { eq } from "drizzle-orm";
import {
  Clock,
  Duration,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
} from "effect";
import { compileEval } from "../../../sdk/src/evals/compiler";
import { SourceTokensNone } from "../../src/codebase/source-token";
import { GridRun, GridRunLive } from "../../src/grid/run";
import { EvalRepositoriesLive } from "../../src/layer";
import { ModelPrices } from "../../src/ports/model-source";
import { TrialRunner } from "../../src/ports/trial-runner";
import { RunRepository } from "../../src/repositories/run-repository";
import { AgentTrial } from "../../src/services/agent-trial";
import { BaselinesLive } from "../../src/services/baselines";
import { skipWithoutDatabase } from "../fixtures/database";
import definition from "../fixtures/source-snapshot";

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
    const entry = resolve(import.meta.dir, "../fixtures/source-snapshot.ts");
    const compiled = await compileEval(entry);
    expect(compiled.prompt).toBe(definition.prompt);
    const validator = compiled.cases[0]?.validator;
    const sourceFiles = [
      {
        path: "tests/fixtures/source-snapshot.ts",
        content: await readFile(entry, "utf8"),
      },
    ];
    expect(validator?.sourceFiles).toEqual(sourceFiles);
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
              validator,
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
        const setupOf = (run: typeof running | undefined) =>
          Schema.decodeUnknownSync(EvalSetup)(
            Option.getOrNull(run?.cells[0]?.setup ?? Option.none())
          );
        expect(setupOf(running).validatorFiles).toEqual(sourceFiles);

        yield* Effect.promise(() =>
          db
            .update(evalTask)
            .set({
              validatorConfig: {
                name: "changed",
                source: "changed",
                sourceFiles: [],
              },
            })
            .where(eq(evalTask.organizationId, organizationId))
        );
        expect(setupOf(yield* read()).validatorFiles).toEqual(sourceFiles);

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
        expect(setupOf(page.runs[0]).validatorFiles).toEqual([]);
        expect(yield* grid.get("another-org", id)).toEqual(Option.none());
      }).pipe(Effect.provide(TestLayer))
    );
  });
});
