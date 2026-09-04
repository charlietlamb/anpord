import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Duration, Effect, Layer, Option, Redacted } from "effect";
import { cellKeyOf } from "../../src/domain/cell";
import type { RequestedProfile } from "../../src/domain/harness-profile";
import { profileVersionOf } from "../../src/domain/profile-identity";
import { gridOf } from "../../src/grid/stored-grid";
import { runToState } from "../../src/grid/stored-run-state";
import { EvalRepositoriesLive } from "../../src/layer";
import { HarnessProfileRepository } from "../../src/repositories/harness-profile-repository";
import { RunQuery } from "../../src/repositories/run-query";
import { RunRepository } from "../../src/repositories/run-repository";
import { skipWithoutDatabase } from "../fixtures/database";
import { taskFixture } from "../fixtures/eval-rows";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const TestLayer = EvalRepositoriesLive.pipe(
  Layer.provide(IdGeneratorLive),
  Layer.provideMerge(DatabaseLive),
  Layer.provide(
    Layer.succeed(DatabaseConfig, {
      poolMax: 4,
      statementTimeout: Duration.seconds(30),
      url: Redacted.make(URL ?? ""),
    })
  )
);

const suffix = Date.now();
const organizationId = `org_profile_${suffix}`;
const taskId = `task_profile_${suffix}`;
const taskInternalId = `taskint_profile_${suffix}`;

type Tags = Database | HarnessProfileRepository | RunQuery | RunRepository;

const run = <A, E>(effect: Effect.Effect<A, E, Tags>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(TestLayer)) as Effect.Effect<A, E>
  );

const profile = (name: string, agents: string): RequestedProfile => ({
  env: { SAMPLE_MODE: "strict" },
  files: { "workspace/AGENTS.md": agents },
  install: null,
  name,
  run: null,
  systemPrompt: "You are the sample agent.\n",
});

const register = (subject: RequestedProfile) =>
  Effect.flatMap(HarnessProfileRepository, (profiles) =>
    profiles.insertIfAbsent({
      ...subject,
      base: "opencode",
      organizationId,
      version: profileVersionOf(subject),
    })
  );

describe.skipIf(skipWithoutDatabase())("harness profiles in the record", () => {
  beforeAll(async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* Database;

        yield* Effect.promise(() =>
          db
            .insert(organization)
            .values({
              createdAt: new Date(),
              id: organizationId,
              name: "profiles",
              slug: `profiles-${suffix}`,
            })
            .onConflictDoNothing()
        );

        yield* Effect.promise(() =>
          db
            .insert(taskFixture.table)
            .values(
              taskFixture.values({
                id: taskId,
                internalId: taskInternalId,
                organizationId,
              })
            )
            .onConflictDoNothing()
        );
      })
    );
  });

  it("returns the row it already has rather than writing a second", async () => {
    const subject = profile("sample", "# Sample\n");

    const [first, second] = await run(
      Effect.all([register(subject), register(subject)])
    );

    expect(second.internalId).toBe(first.internalId);
    expect(second.version).toBe(first.version);
    expect(second.files).toEqual(subject.files);
  });

  it("gives an edited profile a new row on the same name", async () => {
    const [first, edited] = await run(
      Effect.all([
        register(profile("edited", "# Sample\n")),
        register(profile("edited", "# Sample, revised\n")),
      ])
    );

    expect(edited.internalId).not.toBe(first.internalId);
    expect(edited.version).not.toBe(first.version);
  });

  it("keeps two profiles on one base as two cells and two columns", async () => {
    const stored = await run(
      Effect.gen(function* () {
        const runs = yield* RunRepository;
        const query = yield* RunQuery;

        const created = yield* runs.insert({
          cellCount: 2,
          name: "two-profiles",
          organizationId,
          startedBy: null,
          trialCount: 2,
        });

        const registered = yield* Effect.all([
          register(profile("alpha", "# Alpha\n")),
          register(profile("beta", "# Beta\n")),
        ]);

        yield* runs.insertCells(
          registered.map((row) => ({
            cellKey: cellKeyOf({
              harness: "opencode",
              model: "anthropic/claude-sonnet-4.6",
              profile: row.name,
              provider: "daytona",
              taskId,
              taskVersion: taskInternalId,
            }),
            harness: "opencode" as const,
            harnessVersion: "1.18.21",
            model: "anthropic/claude-sonnet-4.6",
            profileInternalId: row.internalId,
            prompt: "fix the failing test",
            provider: "daytona" as const,
            runInternalId: created.internalId,
            taskInternalId,
          }))
        );

        return yield* Effect.all({
          detail: query.findRun(organizationId, created.id),
          tasks: query.findRunTasks({ organizationId, runId: created.id }),
        });
      })
    );

    expect(Option.isSome(stored.detail)).toBe(true);

    if (Option.isNone(stored.detail)) {
      return;
    }

    expect(stored.detail.value.cells).toHaveLength(2);

    const state = runToState(stored.detail.value);

    /* Sorted rather than read in query order: the stored read has no ORDER
       BY, and what matters is that both profiles survived as their own
       column rather than which of them Postgres returned first. */
    expect(state.tasks).toHaveLength(2);
    expect(state.tasks.map((task) => task.profile?.name).toSorted()).toEqual([
      "alpha",
      "beta",
    ]);
    expect(state.cells.map((cell) => cell.taskIndex).toSorted()).toEqual([
      0, 1,
    ]);

    /* A rebuilt grid squares its cases against its tasks, so two profiles that
       collapsed into one column here would run the wrong pairing on resume. */
    expect(gridOf(stored.tasks).tasks).toHaveLength(2);
    expect(
      stored.tasks
        .map((cell) => cell.profile?.files["workspace/AGENTS.md"])
        .toSorted()
    ).toEqual(["# Alpha\n", "# Beta\n"]);
  });
});
