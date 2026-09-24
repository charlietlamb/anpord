import { AnpordApi } from "@anpord/schema/public/client";
import { Args, Command, Options } from "@effect/cli";
import { Effect, Option, Schema } from "effect";
import { apiKeyConfig, ClientLayer, webUrlConfig } from "../client/config";
import { compileEvalEffect } from "../evals/compiler";
import { evalFilesIn } from "./eval-files";
import { EvalGate, failWhen, NoEvalFiles, problemsWith } from "./eval-gate";
import { formatGridSummary, type GridMode, liveGrid } from "./eval-grid";
import { importEval } from "./eval-import";
import { localProblems, reportLocal, runLocally } from "./eval-local";
import type { EvalOutcome } from "./eval-outcome";
import { reportFinished, reportStarted, writeReport } from "./eval-report";
import { waitForBatch } from "./eval-run";
import { evalTrigger } from "./eval-trigger";
import { buildGithubCheck } from "./github-check";
import { postCheckRun } from "./github-check-client";
import { githubContext } from "./github-context";
import { attended, json, note } from "./render";

const asJson = Options.boolean("json").pipe(
  Options.withDescription("Print each finished batch as JSON")
);
const evalFile = Args.text({ name: "file" }).pipe(
  Args.withDescription(
    "A TypeScript eval file; discovers *.eval.ts when omitted"
  ),
  Args.optional
);
const noWait = Options.boolean("no-wait").pipe(
  Options.withDescription("Start batches without waiting")
);
const failOn = Options.choice("fail-on", EvalGate.literals).pipe(
  Options.withDescription(
    "failures fails on any run whose trials did not all pass, strict also requires every expected run and trial, never only fails a batch that did not finish"
  ),
  Options.withDefault("failures" as const)
);
const timeout = Options.integer("timeout").pipe(
  Options.withDescription("Maximum seconds to wait per batch"),
  Options.withSchema(Schema.Int.pipe(Schema.positive())),
  Options.withDefault(1200)
);
const local = Options.boolean("local").pipe(
  Options.withDescription(
    "Run every case on this machine instead of a cloud sandbox"
  )
);
const output = Options.text("output").pipe(
  Options.withDescription("Write a JSON report to this file"),
  Options.optional
);
const gridModeOf = (wantsJson: boolean, live: boolean): GridMode => {
  if (wantsJson) {
    return "silent";
  }

  return live ? "grid" : "lines";
};

const describe = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const runOneEval = (
  file: string,
  options: {
    readonly gate: EvalGate;
    readonly skipWait: boolean;
    readonly wantsJson: boolean;
    readonly timeoutSeconds: number;
  },
  save: (outcome: EvalOutcome) => ReturnType<typeof writeReport>
) =>
  Effect.gen(function* () {
    let batchId: string | null = null;
    return yield* Effect.gen(function* () {
      const api = yield* AnpordApi;
      const payload = yield* compileEvalEffect(file);
      const trigger = yield* evalTrigger;
      const started = yield* api.evals.start({
        payload: { ...payload, trigger },
      });
      batchId = started.id;
      yield* reportStarted(file, batchId);
      const pending: EvalOutcome = {
        batch: null,
        batchId,
        file,
        problems: [],
      };
      yield* save(pending);
      if (options.skipWait) {
        yield* json(started);
        return pending;
      }
      const live = !options.wantsJson && (yield* attended);
      const watcher = yield* liveGrid(
        payload.trials,
        gridModeOf(options.wantsJson, live)
      );
      const batch = yield* waitForBatch(
        batchId,
        watcher,
        options.timeoutSeconds
      );
      yield* options.wantsJson
        ? json(batch)
        : note(formatGridSummary(batch, payload.trials, live));
      return {
        batch,
        batchId,
        file,
        problems: problemsWith(batch, options.gate, {
          runs: payload.cases.length * payload.variants.length,
          trials: payload.trials,
        }),
      } satisfies EvalOutcome;
    }).pipe(
      Effect.catchAll((error) =>
        Effect.succeed({
          batch: null,
          batchId,
          file,
          problems: [describe(error)],
        } satisfies EvalOutcome)
      )
    );
  });

const reportToGithub = (outcomes: readonly EvalOutcome[]) =>
  Effect.gen(function* () {
    const context = yield* githubContext;
    if (Option.isNone(context)) {
      return;
    }
    const webUrl = yield* webUrlConfig;
    yield* postCheckRun(context.value, buildGithubCheck(outcomes, webUrl));
  }).pipe(
    Effect.catchAll((error) =>
      note(`The GitHub check was not posted. ${describe(error)}`)
    )
  );

const recordedLocally = (file: string) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const compiled = yield* compileEvalEffect(file);
    const payload = {
      ...compiled,
      trials: 1,
      variants: compiled.variants.slice(0, 1),
    };
    const trigger = yield* evalTrigger;

    const started = yield* api.evals.start({
      payload: { ...payload, local: true, trigger },
    });

    yield* reportStarted(file, started.id);

    yield* Effect.addFinalizer(() =>
      api.evals.finish({ payload: { id: started.id } }).pipe(Effect.ignore)
    );

    const leased = yield* api.evals
      .credentials({
        payload: {
          harness: payload.variants[0]?.harness ?? "codex",
          id: started.id,
        },
      })
      .pipe(
        Effect.map(
          (lease): Readonly<Record<string, string>> | undefined => lease.values
        ),
        Effect.catchAll(() => Effect.succeed(undefined))
      );

    const runIdOf = (caseId: string) =>
      started.runs.find(
        (run) => run.caseId === caseId && run.variantIndex === 0
      )?.id;

    return yield* runLocally(payload, {
      credentials: leased,
      onTrial: (caseId, trial) => {
        const runId = runIdOf(caseId);

        return runId === undefined
          ? Effect.void
          : api.evals
              .reportTrial({ payload: { ...trial, runId } })
              .pipe(Effect.ignore);
      },
    });
  }).pipe(Effect.scoped, Effect.provide(ClientLayer));

const runOneEvalLocally = (file: string) =>
  apiKeyConfig.pipe(
    Effect.matchEffect({
      onFailure: () =>
        compileEvalEffect(file).pipe(
          Effect.flatMap((payload) => runLocally(payload))
        ),
      onSuccess: () => recordedLocally(file),
    })
  );

const runEveryEvalLocally = (files: readonly string[], gate: EvalGate) =>
  Effect.gen(function* () {
    const problems: string[] = [];

    yield* Effect.forEach(files, (one) =>
      Effect.gen(function* () {
        const cases = yield* runOneEvalLocally(one);

        yield* reportLocal(one, cases);
        problems.push(...localProblems(cases));
      })
    );

    return yield* failWhen(gate === "never" ? [] : problems);
  });

const runEveryEvalHosted = (
  files: readonly string[],
  options: {
    readonly gate: EvalGate;
    readonly path: Option.Option<string>;
    readonly skipWait: boolean;
    readonly timeoutSeconds: number;
    readonly wantsJson: boolean;
  }
) =>
  Effect.gen(function* () {
    const { gate, path, skipWait, timeoutSeconds, wantsJson } = options;
    const outcomes: EvalOutcome[] = [];
    yield* Effect.forEach(files, (one, index) =>
      Effect.gen(function* () {
        const save = (outcome: EvalOutcome) =>
          Effect.gen(function* () {
            outcomes[index] = outcome;
            yield* writeReport(outcomes, path);
          });
        const outcome = yield* runOneEval(
          one,
          { gate, skipWait, timeoutSeconds, wantsJson },
          save
        );
        yield* save(outcome);
      })
    );
    yield* reportFinished(outcomes);
    if (!skipWait) {
      yield* reportToGithub(outcomes);
    }
    return yield* failWhen(outcomes.flatMap((outcome) => outcome.problems));
  }).pipe(Effect.provide(ClientLayer));

export const runEval = Command.make(
  "eval",
  { asJson, evalFile, failOn, local, noWait, output, timeout },
  ({
    asJson: wantsJson,
    evalFile: file,
    failOn: gate,
    local: onThisMachine,
    noWait: skipWait,
    output: path,
    timeout: timeoutSeconds,
  }) =>
    Effect.gen(function* () {
      const files = yield* Option.match(file, {
        onNone: () => evalFilesIn("."),
        onSome: (one) => Effect.succeed([one] as readonly string[]),
      });

      if (files.length === 0) {
        return yield* Effect.fail(new NoEvalFiles());
      }

      return yield* onThisMachine
        ? runEveryEvalLocally(files, gate)
        : runEveryEvalHosted(files, {
            gate,
            path,
            skipWait,
            timeoutSeconds,
            wantsJson,
          });
    })
).pipe(
  Command.withDescription("Compile and run an eval from TypeScript"),
  Command.withSubcommands([importEval])
);
