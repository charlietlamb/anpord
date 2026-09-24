import type { EvalCaseId } from "@anpord/schema/domain/eval-limits";
import { AnpordApi } from "@anpord/schema/public/client";
import { Effect } from "effect";
import { asAnpordError } from "../client/errors";
import { compileEvalEffect } from "../evals/compiler";
import { type HostedOptions, settleBatch } from "./batch-outcome";
import { reportStarted } from "./eval-report";
import { evalTrigger } from "./eval-trigger";
import type { SaveOutcome, SuiteOutcome } from "./suite-outcome";
import { type Selection, selectFrom } from "./suite-selection";

interface Started {
  batchId: string | null;
  file: string | null;
  suite: string | null;
}

const failedOutcome = (started: Started, error: unknown): SuiteOutcome => ({
  ...started,
  batch: null,
  error: asAnpordError(error).message,
  problems: [],
});

export const runSuiteFile = (
  file: string,
  selection: Selection,
  options: HostedOptions,
  save: SaveOutcome
) =>
  Effect.gen(function* () {
    const known: Started = { batchId: null, file, suite: null };

    return yield* Effect.gen(function* () {
      const api = yield* AnpordApi;
      const request = yield* selectFrom(
        file,
        yield* compileEvalEffect(file),
        selection
      );
      known.suite = request.suite.name;
      const trigger = yield* evalTrigger;
      const started = yield* api.runner.start({
        payload: { ...request, trigger },
      });
      known.batchId = started.id;
      yield* reportStarted(`${request.suite.name} (${file})`, started.id);
      yield* save({ ...known, batch: null, error: null, problems: [] });

      const settled = yield* settleBatch(started, request.trials, options);

      return { ...known, ...settled } satisfies SuiteOutcome;
    }).pipe(
      Effect.catchAll((error) => Effect.succeed(failedOutcome(known, error)))
    );
  }).pipe(Effect.withSpan("Cli.runSuiteFile", { attributes: { file } }));

const STORED_CASE_TRIALS = 1;

export const runStoredCase = (
  caseId: EvalCaseId,
  variants: readonly string[],
  options: HostedOptions,
  save: SaveOutcome
) =>
  Effect.gen(function* () {
    const known: Started = { batchId: null, file: null, suite: null };

    return yield* Effect.gen(function* () {
      const api = yield* AnpordApi;
      const stored = yield* api.cases.get({ payload: { id: caseId } });
      known.suite = stored.suite.name;
      const started = yield* api.cases.run({
        payload: {
          id: caseId,
          trials: STORED_CASE_TRIALS,
          variants: variants.length === 0 ? undefined : variants,
        },
      });
      known.batchId = started.id;
      yield* reportStarted(`${stored.suite.name}, ${stored.name}`, started.id);
      yield* save({ ...known, batch: null, error: null, problems: [] });

      const settled = yield* settleBatch(started, STORED_CASE_TRIALS, options);

      return { ...known, ...settled } satisfies SuiteOutcome;
    }).pipe(
      Effect.catchAll((error) => Effect.succeed(failedOutcome(known, error)))
    );
  }).pipe(Effect.withSpan("Cli.runStoredCase", { attributes: { caseId } }));
