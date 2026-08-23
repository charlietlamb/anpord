import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { DatabaseLive } from "@anpord/db/client";
import { DatabaseConfigLive } from "@anpord/db/config";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Effect, Layer, Option, Redacted } from "effect";
import { GridRun } from "../src/grid/run";
import {
  EvalGridLive,
  EvalRepositoriesLive,
  EvalSandboxLive,
} from "../src/layer";
import { Workbenches } from "../src/services/workbench";

const [playgroundId, organizationId] = Bun.argv.slice(2);

if (playgroundId === undefined || organizationId === undefined) {
  throw new Error(
    "usage: bun run scripts/run-playground.ts <playground-id> <organization-id>"
  );
}

/** Whatever the harness the playground names authenticates with. Read from
 * this machine's own logins so a run started here is the run the dashboard
 * would have started. */
const credentialsFor = (harness: string) => {
  if (harness === "opencode") {
    const key = process.env.ANTHROPIC_API_KEY;

    return Redacted.make(
      key === undefined
        ? readFileSync(
            `${homedir()}/.local/share/opencode/auth.json`,
            "utf8"
          ).trim()
        : JSON.stringify({ anthropic: { key, type: "api" } })
    );
  }

  return Redacted.make(
    readFileSync(`${homedir()}/.codex/auth.json`, "utf8").trim()
  );
};

const DatabaseLayer = DatabaseLive.pipe(Layer.provide(DatabaseConfigLive));

const RunLayer = EvalGridLive.pipe(
  Layer.provideMerge(EvalSandboxLive),
  Layer.provideMerge(EvalRepositoriesLive),
  Layer.provideMerge(Layer.mergeAll(DatabaseLayer, IdGeneratorLive))
);

const program = Effect.gen(function* () {
  const runs = yield* GridRun;
  const workbenches = yield* Workbenches;
  const found = yield* workbenches.find(organizationId, playgroundId);

  if (Option.isNone(found)) {
    return yield* Effect.die(`no playground ${playgroundId}`);
  }

  const harness = found.value.config.columns[0]?.harness ?? "codex";

  const runId = yield* workbenches.run({
    credentials: credentialsFor(harness),
    harnessVersion: harness === "opencode" ? "1.18.21" : "0.144.4",
    id: playgroundId,
    organizationId,
    startedBy: null,
  });

  /* The run is started in the background and this process owns the pool it
     writes through, so exiting when the id comes back closes the connection
     under a trial still recording. Waited on here until the run leaves the
     running state. */
  yield* Effect.iterate(true, {
    body: () =>
      Effect.sleep("5 seconds").pipe(
        Effect.zipRight(runs.get(organizationId, runId)),
        Effect.tap((row) =>
          Effect.logInfo("waiting on the run").pipe(
            Effect.annotateLogs({
              runId,
              status: Option.isSome(row) ? row.value.status : "missing",
            })
          )
        ),
        Effect.map(
          (row) => Option.isSome(row) && row.value.status === "running"
        )
      ),
    while: (running) => running,
  });

  return { harness, runId };
});

await Effect.runPromise(
  program.pipe(
    Effect.tap((started) => Effect.logInfo(JSON.stringify(started))),
    Effect.provide(RunLayer),
    Effect.scoped
  )
);
