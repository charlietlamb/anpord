import { AnpordApi } from "@anpord/schema/public/client";
import { Args, Command, Options } from "@effect/cli";
import { Effect, Option, Schema } from "effect";
import { ClientLayer, webUrlConfig } from "../client/config";
import { compileEvalEffect } from "../evals/compiler";
import { evalFilesIn } from "./eval-files";
import { EvalGate, failWhen, NoEvalFiles, problemsWith } from "./eval-gate";
import { formatGridSummary, liveGrid } from "./eval-grid";
import { importEval } from "./eval-import";
import type { EvalOutcome } from "./eval-outcome";
import { reportFinished, reportStarted, writeReport } from "./eval-report";
import { waitForRun } from "./eval-run";
import { buildGithubCheck } from "./github-check";
import { postCheckRun } from "./github-check-client";
import { githubContext } from "./github-context";
import { attended, json, note } from "./render";

const asJson = Options.boolean("json").pipe(
  Options.withDescription("Print each finished run as JSON")
);
const evalFile = Args.text({ name: "file" }).pipe(
  Args.withDescription(
    "A TypeScript eval file; discovers *.eval.ts when omitted"
  ),
  Args.optional
);
const noWait = Options.boolean("no-wait").pipe(
  Options.withDescription("Start runs without waiting")
);
const failOn = Options.choice("fail-on", EvalGate.literals).pipe(
  Options.withDescription("strict requires every trial to pass"),
  Options.withDefault("strict" as const)
);
const timeout = Options.integer("timeout").pipe(
  Options.withDescription("Maximum seconds to wait per run"),
  Options.withSchema(Schema.Int.pipe(Schema.positive())),
  Options.withDefault(1200)
);
const output = Options.text("output").pipe(
  Options.withDescription("Write a JSON report to this file"),
  Options.optional
);
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
    let runId: string | null = null;
    return yield* Effect.gen(function* () {
      const api = yield* AnpordApi;
      const payload = yield* compileEvalEffect(file);
      const started = yield* api.evals.start({ payload });
      runId = started.id;
      yield* reportStarted(file, runId);
      const pending: EvalOutcome = { file, runId, problems: [], run: null };
      yield* save(pending);
      if (options.skipWait) {
        yield* json(started);
        return pending;
      }
      const live = !options.wantsJson && (yield* attended);
      const draw = yield* liveGrid(payload.trials, live);
      const run = yield* waitForRun(runId, draw, options.timeoutSeconds);
      yield* options.wantsJson
        ? json(run)
        : note(formatGridSummary(run, payload.trials, live));
      return {
        file,
        runId,
        run,
        problems: problemsWith(run, options.gate, {
          cells: payload.cases.length * payload.tasks.length,
          trials: payload.trials,
        }),
      } satisfies EvalOutcome;
    }).pipe(
      Effect.catchAll((error) =>
        Effect.succeed({
          file,
          runId,
          run: null,
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

export const runEval = Command.make(
  "eval",
  { asJson, evalFile, failOn, noWait, output, timeout },
  ({
    asJson: wantsJson,
    evalFile: file,
    failOn: gate,
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
    }).pipe(Effect.provide(ClientLayer))
).pipe(
  Command.withDescription("Compile and run an eval from TypeScript"),
  Command.withSubcommands([importEval])
);
