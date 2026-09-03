import { AnpordApi } from "@anpord/schema/public/client";
import { Args, Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
import { webUrlConfig } from "../client/config";
import { compileEvalEffect } from "../evals/compiler";
import { evalFilesIn } from "./eval-files";
import { failWhen, NoEvalFiles, problemsWith } from "./eval-gate";
import { liveGrid, summaryOf } from "./eval-grid";
import type { EvalOutcome } from "./eval-outcome";
import { waitForRun } from "./eval-run";
import { checkRunOf } from "./github-check";
import { postCheckRun } from "./github-check-client";
import { githubContext } from "./github-context";
import { attended, json, note } from "./render";

const asJson = Options.boolean("json").pipe(
  Options.withDescription("Print the finished run as JSON")
);

const evalFile = Args.text({ name: "file" }).pipe(
  Args.withDescription(
    "A TypeScript file that default exports defineEval(...); every *.eval.ts is run when omitted"
  ),
  Args.optional
);

const noWait = Options.boolean("no-wait").pipe(
  Options.withDescription("Start the run and print its id, without waiting")
);

const failOn = Options.choice("fail-on", [
  "never",
  "regressed",
  "unscored",
]).pipe(
  Options.withDescription("What makes the command exit nonzero"),
  Options.withDefault("regressed" as const)
);

const runOneEval = (
  file: string,
  options: {
    readonly gate: "never" | "regressed" | "unscored";
    readonly label: boolean;
    readonly skipWait: boolean;
    readonly wantsJson: boolean;
  }
) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const payload = yield* compileEvalEffect(file);
    const started = yield* api.evals.start({ payload });

    if (options.skipWait) {
      yield* json(started);
      const unfinished: EvalOutcome = {
        file,
        problems: [],
        run: Option.none(),
      };
      return unfinished;
    }

    const live = !options.wantsJson && (yield* attended);

    if (live || options.label) {
      yield* note(`${file} · run ${started.id}`);
    }

    const draw = yield* liveGrid(payload.trials, live);
    const run = yield* waitForRun(started.id, draw);

    yield* options.wantsJson
      ? json(run)
      : note(summaryOf(run, payload.trials, live));

    const outcome: EvalOutcome = {
      file,
      problems: problemsWith(run, options.gate),
      run: Option.some(run),
    };
    return outcome;
  });

const describe = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/* The check reports; the gate decides. Whatever goes wrong here becomes one
   line on stderr, so the exit code is the gate's alone. */
const reportToGithub = (outcomes: readonly EvalOutcome[]) =>
  Effect.gen(function* () {
    if (outcomes.every((outcome) => Option.isNone(outcome.run))) {
      return;
    }

    const context = yield* githubContext;

    if (Option.isNone(context)) {
      return;
    }

    const webUrl = yield* webUrlConfig;

    yield* postCheckRun(context.value, checkRunOf(outcomes, webUrl));
    yield* note(`Posted the anpord check on ${context.value.sha}`);
  }).pipe(
    Effect.catchAll((error) =>
      note(`The GitHub check was not posted. ${describe(error)}`)
    )
  );

export const runEval = Command.make(
  "eval",
  { asJson, evalFile, failOn, noWait },
  ({ asJson: wantsJson, evalFile: file, failOn: gate, noWait: skipWait }) =>
    Effect.gen(function* () {
      const files = yield* Option.match(file, {
        onNone: () => evalFilesIn("."),
        onSome: (one) => Effect.succeed([one] as readonly string[]),
      });

      if (files.length === 0) {
        return yield* Effect.fail(new NoEvalFiles());
      }

      const outcomes = yield* Effect.forEach(files, (one) =>
        runOneEval(one, {
          gate,
          label: files.length > 1,
          skipWait,
          wantsJson,
        })
      );

      yield* reportToGithub(outcomes);

      return yield* failWhen(outcomes.flatMap((outcome) => outcome.problems));
    })
).pipe(Command.withDescription("Compile and run an eval from TypeScript"));
