import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CredentialResolver } from "@anpord/eval/credentials/connections";
import { resolveTaskCredentials } from "@anpord/eval/credentials/tasks";
import { GridRun } from "@anpord/eval/grid/run";
import { RunQuery } from "@anpord/eval/repositories/run-query";
import {
  Clock,
  Duration,
  Effect,
  ManagedRuntime,
  Option,
  Schedule,
} from "effect";
import { compileEval } from "../../../packages/sdk/src/evals/compiler";
import { DispatchingLayer } from "../src/layer";

/**
 * Starts one eval against the deployed worker and waits for it to settle.
 *
 * Everything goes through the path the api uses: grid.start records the run
 * and hands it to Trigger. Nothing dispatches by hand, because doing that
 * alongside start is two dispatches, and the second is correctly refused as
 * work already under way.
 *
 *   bun --env-file=.env run scripts/smoke.ts
 */
const ORG = process.env.SMOKE_ORGANIZATION_ID ?? "";

if (ORG === "") {
  process.stderr.write("SMOKE_ORGANIZATION_ID is required\n");
  process.exit(1);
}

/* Caches what it fetched, and says which of the two it did. A second run of
   this same source restores rather than fetches, which is the thing worth
   proving. */
/* Written to disk and compiled, because that is what a user's eval does: the
   sdk bundles the file, strips its types, and wraps each prepare in the runtime
   that calls it and reports what it returned. Source handed over raw is a
   function nobody calls, and the run reports an empty prepare rather than a
   broken one. */
const EVAL_FILE = `import { defineEval } from "anpord";
import type { Prepare } from "anpord";

export const install: Prepare = async ({ cached, exec }) => {
  if (cached) {
    return { fromCache: true };
  }

  await exec("sh", [
    "-c",
    "mkdir -p vendor && npm pack lodash@4.17.21 --pack-destination vendor",
  ]);

  return { fromCache: false };
};

export default defineEval({
  cases: [
    {
      cache: { key: "smoke-lodash-1", path: "vendor" },
      name: "keeps what it fetched",
      prepare: install,
      variables: { task: "nothing" },
      verify: "ls vendor/*.tgz",
    },
  ],
  name: "smoke",
  prompt: "Reply with the single word done. Change nothing.",
  tasks: [{ harness: "codex", model: "gpt-5.1-codex", provider: "daytona" }],
  trials: 1,
});`;

const SETTLE_EVERY = Duration.seconds(15);
const GIVE_UP_AFTER = Duration.minutes(20);

/* Dispatching rather than the worker's own layer: the worker runs what it is
   handed in process, which is right for the worker and wrong here. This stands
   in for the api, so it hands the run to Trigger the way the api does. */
const runtime = ManagedRuntime.make(DispatchingLayer);

const compiled = Effect.gen(function* () {
  const directory = yield* Effect.promise(() =>
    mkdtemp(join(tmpdir(), "anpord-smoke-"))
  );
  const file = join(directory, "smoke.eval.ts");

  yield* Effect.promise(() => writeFile(file, EVAL_FILE));

  return yield* Effect.promise(() => compileEval(file));
});

const started = Effect.gen(function* () {
  const grid = yield* GridRun;
  const resolver = yield* CredentialResolver;
  const payload = yield* compiled;

  /* A task is reused when its identity matches one already stored, keeping the
     prepare and verify it was first written with. A smoke test that changes
     either needs a name nothing has claimed. */
  const identity = `smoke-${yield* Clock.currentTimeMillis}`;
  const [subject] = payload.cases;

  if (subject === undefined) {
    return yield* Effect.die("the eval compiled to no cases");
  }

  const tasks = yield* resolveTaskCredentials(
    resolver,
    {
      id: "smoke",
      isUser: false,
      organizationId: ORG,
      permissions: [],
    } as never,
    payload.tasks.map((task) => ({
      harness: task.harness,
      harnessVersion: task.harnessVersion ?? "latest",
      model: task.model,
      provider: task.provider,
    })),
    ""
  );

  return yield* grid.start({
    cases: [
      {
        identity,
        name: `${subject.name} (${identity})`,
        cache: subject.cache,
        prepare: subject.prepare ?? null,
        source: subject.source ?? { kind: "empty" as const },
        validator: subject.validator ?? null,
        variables: subject.variables ?? {},
        verify: subject.verify ?? null,
      },
    ],
    organizationId: ORG,
    prompt: payload.prompt,
    startedBy: null,
    tasks,
    trials: payload.trials,
  });
});

const settle = (id: string) =>
  Effect.gen(function* () {
    const grid = yield* GridRun;
    const state = yield* grid.get(ORG, id);

    if (Option.isNone(state)) {
      return yield* Effect.fail(`${id} is not there`);
    }

    const { status } = state.value;

    /* With a clock reading, because the interesting question while this runs
       is whether anything is moving, and a bare status repeated cannot say. */
    const at = yield* Clock.currentTimeMillis;

    process.stdout.write(
      `  ${new Date(at).toISOString().slice(11, 19)} ${status}\n`
    );

    return status === "running"
      ? yield* Effect.fail(`${id} is still running`)
      : status;
  }).pipe(
    Effect.retry(
      Schedule.spaced(SETTLE_EVERY).pipe(Schedule.upTo(GIVE_UP_AFTER))
    )
  );

const report = (id: string) =>
  Effect.gen(function* () {
    const query = yield* RunQuery;
    const found = yield* query.findRun(ORG, id);

    if (Option.isNone(found)) {
      return;
    }

    for (const cell of found.value.cells) {
      for (const trial of cell.trials) {
        if (Option.isSome(trial)) {
          process.stdout.write(
            `  prepared: ${JSON.stringify(trial.value.prepared ?? null)}\n`
          );
        }
      }
    }
  }).pipe(Effect.ignore);

const outcome = await runtime.runPromise(
  Effect.gen(function* () {
    const at = yield* Clock.currentTimeMillis;
    const id = yield* started;

    /* Named so a reader can tell a dispatched run from one this process ran
       itself, which is the difference between exercising the handoff and
       standing in for it. */
    process.stdout.write(`started ${id}, handed to the worker\n`);

    const status = yield* settle(id);
    const took = Math.round(((yield* Clock.currentTimeMillis) - at) / 1000);

    process.stdout.write(`${id} ${status} in ${took}s\n`);

    yield* report(id);

    return status;
  }) as never
);

/* Disposed rather than exited, so anything the run left open closes before the
   process does. */
await runtime.dispose();

process.exit(outcome === "finished" ? 0 : 1);
