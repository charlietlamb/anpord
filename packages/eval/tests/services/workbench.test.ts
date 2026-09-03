import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Actor, OrganizationId, UserId } from "@anpord/schema/domain/actor";
import {
  Duration,
  Effect,
  Either,
  Layer,
  ManagedRuntime,
  Option,
  Redacted,
} from "effect";
import { SourceTokensNone } from "../../src/codebase/source-token";
import { layerTestResolver } from "../../src/credentials/layer-test-resolver";
import { EvalGridLive, EvalSandboxLive } from "../../src/layer";
import { HarnessVersionsLive } from "../../src/services/harness-versions";
import { Workbenches } from "../../src/services/workbench";
import { skipWithoutDatabase } from "../fixtures/database";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const TestLayer = EvalGridLive.pipe(
  Layer.provide(EvalSandboxLive),
  Layer.provide(SourceTokensNone),
  Layer.provide(layerTestResolver()),
  Layer.provide(HarnessVersionsLive),
  Layer.provide(IdGeneratorLive),
  Layer.provideMerge(DatabaseLive),
  Layer.provide(
    Layer.succeed(DatabaseConfig, {
      poolMax: 8,
      statementTimeout: Duration.seconds(30),
      url: Redacted.make(URL ?? ""),
    })
  )
);

const runtime = ManagedRuntime.make(TestLayer);
const suffix = Date.now();
const organizationId = `org_wb_${suffix}`;
const actor = Actor.make({
  id: UserId.make("user_workbench"),
  isUser: true,
  organizationId: OrganizationId.make(organizationId),
  permissions: [],
});

const run = <A, E>(effect: Effect.Effect<A, E, Database | Workbenches>) =>
  runtime.runPromise(effect as Effect.Effect<A, E, never>);

describe.skipIf(skipWithoutDatabase())("Workbenches", () => {
  afterAll(async () => {
    await runtime.dispose();
  });

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
              name: "workbench",
              slug: `wb-${suffix}`,
            })
            .onConflictDoNothing()
        );
      })
    );
  });

  it("creates an empty playground that cannot run yet", async () => {
    const created = await run(
      Effect.gen(function* () {
        const workbenches = yield* Workbenches;

        return yield* workbenches.create({
          actorId: null,
          name: "first",
          organizationId,
        });
      })
    );

    expect(created.config.cases).toHaveLength(0);
    expect(created.lastRunId).toBeNull();
  });

  /** The point of the table. A playground is a draft somebody returns to, so
   * what they saved has to still be there. */
  it("saves a configuration and reads it back", async () => {
    const saved = await run(
      Effect.gen(function* () {
        const workbenches = yield* Workbenches;

        const created = yield* workbenches.create({
          actorId: null,
          name: "second",
          organizationId,
        });

        yield* workbenches.save({
          config: {
            cases: [
              {
                variables: { task: "fix the failing test" },
                name: "a-case",
                setup: null,
                source: { kind: "empty" },
                verify: "node --test",
              },
            ],
            columns: [
              { harness: "codex", model: "gpt-5-codex", provider: "daytona" },
            ],
            connections: {},
            prompt: "{{task}}",
            trials: 2,
          },
          id: created.id,
          name: "second, edited",
          organizationId,
        });

        return yield* workbenches.find(organizationId, created.id);
      })
    );

    expect(Option.isSome(saved)).toBe(true);

    if (Option.isNone(saved)) {
      return;
    }

    expect(saved.value.name).toBe("second, edited");
    expect(saved.value.config.cases).toHaveLength(1);
    expect(saved.value.config.cases[0]?.variables.task).toBe(
      "fix the failing test"
    );
    expect(saved.value.config.trials).toBe(2);
  });

  it("refuses to run a playground with no cases", async () => {
    const outcome = await runtime.runPromise(
      Effect.gen(function* () {
        const workbenches = yield* Workbenches;

        const created = yield* workbenches.create({
          actorId: null,
          name: "empty",
          organizationId,
        });

        return yield* workbenches.run({
          actor,
          id: created.id,
          legacyHarnessAuth: "",
          organizationId,
          startedBy: null,
        });
      }).pipe(Effect.either)
    );

    expect(Either.isLeft(outcome)).toBe(true);

    if (Either.isRight(outcome)) {
      return;
    }

    expect(outcome.left._tag).toBe("NotRunnable");

    if (outcome.left._tag !== "NotRunnable") {
      return;
    }

    expect(outcome.left.problems).toContain("add at least one case");
  });

  it("refuses a playground belonging to another organization", async () => {
    const created = await run(
      Effect.gen(function* () {
        const workbenches = yield* Workbenches;

        return yield* workbenches.create({
          actorId: null,
          name: "theirs",
          organizationId,
        });
      })
    );

    const found = await run(
      Effect.gen(function* () {
        const workbenches = yield* Workbenches;

        return yield* workbenches.find(`org_other_${suffix}`, created.id);
      })
    );

    expect(Option.isNone(found)).toBe(true);
  });

  it("lists newest first and only for this organization", async () => {
    const listed = await run(
      Effect.gen(function* () {
        const workbenches = yield* Workbenches;

        return yield* workbenches.list(organizationId);
      })
    );

    expect(listed.length).toBeGreaterThan(1);
    expect(listed.every((workbench) => workbench.name.length > 0)).toBe(true);
  });
});
