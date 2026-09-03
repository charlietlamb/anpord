import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { inArray } from "drizzle-orm";
import { Duration, Effect, Layer, Redacted } from "effect";
import { layerTestResolver } from "../../src/credentials/connections";
import type { DestroySandbox } from "../../src/ports/sandbox";
import { SandboxProvider } from "../../src/ports/sandbox";
import { LiveSandboxesLive } from "../../src/repositories/live-sandboxes";
import {
  SandboxReaper,
  SandboxReaperLive,
} from "../../src/services/sandbox-reaper";
import { skipWithoutDatabase } from "../fixtures/database";
import { taskFixture } from "../fixtures/eval-rows";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const destroyed: DestroySandbox[] = [];

const recordingSandboxes = Layer.succeed(
  SandboxProvider,
  SandboxProvider.of({
    attach: () => Effect.die("a reaper never attaches"),
    destroy: (input) =>
      Effect.sync(() => {
        destroyed.push(input);
      }),
    open: () => Effect.die("a reaper never opens"),
  })
);

const TestLayer = SandboxReaperLive.pipe(
  Layer.provide(LiveSandboxesLive),
  Layer.provide(recordingSandboxes),
  Layer.provide(layerTestResolver()),
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
const organizationId = `org_reap_${suffix}`;
const HOURS = 3_600_000;

const run = <A, E>(effect: Effect.Effect<A, E, Database | SandboxReaper>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(TestLayer), Effect.scoped) as Effect.Effect<A, E>
  );

const trialIds = {
  fresh: `trialint_reap_fresh_${suffix}`,
  released: `trialint_reap_released_${suffix}`,
  stale: `trialint_reap_stale_${suffix}`,
};

describe.skipIf(skipWithoutDatabase())("SandboxReaper", () => {
  beforeAll(async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* Database;

        yield* Effect.promise(async () => {
          await db
            .insert(organization)
            .values({
              createdAt: new Date(),
              id: organizationId,
              name: "reap",
              slug: `reap-${suffix}`,
            })
            .onConflictDoNothing();

          await db.insert(evalTask).values(
            taskFixture.values({
              id: `task_reap_${suffix}`,
              internalId: `taskint_reap_${suffix}`,
              organizationId,
            })
          );

          await db.insert(evalRun).values({
            cellCount: 1,
            createdAt: new Date(Date.now() - 12 * HOURS),
            id: `run_reap_${suffix}`,
            internalId: `runint_reap_${suffix}`,
            organizationId,
            status: "running",
            trialCount: 3,
          });

          await db.insert(evalCell).values({
            cellKey: `key_reap_${suffix}`,
            harness: "codex",
            harnessVersion: "0.144.4",
            internalId: `cellint_reap_${suffix}`,
            model: "gpt-5",
            prompt: "do the thing",
            provider: "daytona",
            runInternalId: `runint_reap_${suffix}`,
            status: "running",
            taskInternalId: `taskint_reap_${suffix}`,
          });

          /* Three trials under one twelve-hour-old run, which is what a
             resumed run looks like: the run is ancient, the trials are not
             all. Only the attempt's own age may decide. */
          await db.insert(evalTrial).values([
            {
              cellInternalId: `cellint_reap_${suffix}`,
              internalId: trialIds.stale,
              ordinal: 1,
              provider: "daytona",
              sandboxId: "sbx-stale",
              startedAt: new Date(Date.now() - 2 * HOURS),
              status: "running",
            },
            {
              cellInternalId: `cellint_reap_${suffix}`,
              internalId: trialIds.fresh,
              ordinal: 2,
              provider: "daytona",
              sandboxId: "sbx-fresh",
              startedAt: new Date(),
              status: "running",
            },
            {
              cellInternalId: `cellint_reap_${suffix}`,
              internalId: trialIds.released,
              ordinal: 3,
              passed: true,
              provider: "daytona",
              sandboxId: "sbx-released",
              startedAt: new Date(Date.now() - 2 * HOURS),
              status: "passed",
            },
          ]);
        });
      })
    );
  });

  it("destroys the sandbox of a trial started long ago and clears its id", async () => {
    const reaped = await run(
      Effect.gen(function* () {
        const reaper = yield* SandboxReaper;

        return yield* reaper.reap({ olderThan: Duration.minutes(90) });
      })
    );

    const after = await run(
      Effect.gen(function* () {
        const db = yield* Database;

        return yield* Effect.promise(() =>
          db
            .select({
              internalId: evalTrial.internalId,
              sandboxId: evalTrial.sandboxId,
            })
            .from(evalTrial)
            .where(inArray(evalTrial.internalId, Object.values(trialIds)))
        );
      })
    );

    const byId = new Map(after.map((row) => [row.internalId, row.sandboxId]));

    /* The sweep is global, so other suites' rows may be reaped alongside;
       only this suite's own ids are asserted on. */
    expect(destroyed.map((input) => input.id)).toContain("sbx-stale");
    expect(destroyed.map((input) => input.id)).not.toContain("sbx-fresh");
    expect(destroyed.map((input) => input.id)).not.toContain("sbx-released");
    expect(reaped.destroyed).toBeGreaterThanOrEqual(1);

    expect(byId.get(trialIds.stale)).toBeNull();
    expect(byId.get(trialIds.fresh)).toBe("sbx-fresh");
    expect(byId.get(trialIds.released)).toBe("sbx-released");
  });

  it("finds nothing the second time", async () => {
    const before = destroyed.length;

    const reaped = await run(
      Effect.gen(function* () {
        const reaper = yield* SandboxReaper;

        return yield* reaper.reap({ olderThan: Duration.minutes(90) });
      })
    );

    expect(reaped.destroyed).toBe(0);
    expect(destroyed.length).toBe(before);
  });
});
