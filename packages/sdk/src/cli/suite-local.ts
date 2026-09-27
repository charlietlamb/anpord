import type { AnpordApi } from "@anpord/schema/public/client";
import { type Context, Data, Duration, Effect, Layer, Option } from "effect";
import { apiKeyConfig, ClientLayer } from "../client/config";
import { compileEvalEffect } from "../evals/compiler";
import { type EvalGate, failWhen } from "./eval-gate";
import { runLocally } from "./eval-local";
import { localProblems, reportLocal } from "./local-report";
import { runRecorded } from "./recorded-run";
import { note } from "./render";
import { type Selection, selectFrom } from "./suite-selection";
import { announceOrganization } from "./whoami-command";

class LocalTimeout extends Data.TaggedError("LocalTimeout")<{
  readonly file: string;
  readonly seconds: number;
}> {
  override get message() {
    return `${this.file} did not finish on this machine within ${this.seconds}s.`;
  }
}

type Recorder = Option.Option<Context.Context<AnpordApi>>;

const runSuiteLocally = (
  file: string,
  selection: Selection,
  ui: boolean,
  recorder: Recorder
) =>
  Effect.gen(function* () {
    const request = yield* selectFrom(
      file,
      yield* compileEvalEffect(file),
      selection
    );
    const label = `${request.suite.name} (${file})`;
    if (ui && Option.isNone(recorder)) {
      yield* note(
        "--ui opens the dashboard for a recorded batch, so it needs an API key. Showing the transcript only."
      );
    }

    const { cases, costs, link } = Option.isSome(recorder)
      ? yield* runRecorded(label, request, ui).pipe(
          Effect.provide(recorder.value)
        )
      : {
          cases: yield* runLocally(request),
          costs: null,
          link: Option.none<string>(),
        };

    yield* reportLocal(label, cases, costs, link);

    return localProblems(label, cases);
  });

export const runSuitesLocally = (
  files: readonly string[],
  selection: Selection,
  options: {
    readonly gate: EvalGate;
    readonly timeoutSeconds: Option.Option<number>;
    readonly ui: boolean;
  }
) =>
  Effect.gen(function* () {
    const recorder: Recorder = Option.isSome(yield* Effect.option(apiKeyConfig))
      ? Option.some(yield* Layer.build(ClientLayer))
      : Option.none();

    if (Option.isSome(recorder)) {
      yield* announceOrganization.pipe(Effect.provide(recorder.value));
    }

    const problems = yield* Effect.forEach(files, (file) =>
      Option.match(options.timeoutSeconds, {
        onNone: () => runSuiteLocally(file, selection, options.ui, recorder),
        onSome: (seconds) =>
          runSuiteLocally(file, selection, options.ui, recorder).pipe(
            Effect.timeoutFail({
              duration: Duration.seconds(seconds),
              onTimeout: () => new LocalTimeout({ file, seconds }),
            })
          ),
      })
    );

    return yield* failWhen([], options.gate === "never" ? [] : problems.flat());
  }).pipe(Effect.scoped);
