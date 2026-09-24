import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import type { EvalHarness } from "@anpord/schema/domain/evals";
import { AnpordApi } from "@anpord/schema/public/client";
import { Data, Duration, Effect, Option } from "effect";
import { apiKeyConfig, ClientLayer } from "../client/config";
import { asAnpordError } from "../client/errors";
import { compileEvalEffect } from "../evals/compiler";
import { type EvalGate, failWhen } from "./eval-gate";
import { labelOfRequest, runLocally } from "./eval-local";
import { reportStarted } from "./eval-report";
import { evalTrigger } from "./eval-trigger";
import { localProblems, reportLocal } from "./local-report";
import { runIdsFor } from "./local-run-ids";
import { note } from "./render";
import { type Selection, selectFrom } from "./suite-selection";

class LocalTimeout extends Data.TaggedError("LocalTimeout")<{
  readonly file: string;
  readonly seconds: number;
}> {
  override get message() {
    return `${this.file} did not finish on this machine within ${this.seconds}s.`;
  }
}

const leasesFor = (request: StartBatchRequest, batchId: string) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const harnesses = [
      ...new Set(request.variants.map((variant) => variant.harness)),
    ];
    const leased = yield* Effect.forEach(harnesses, (harness) =>
      api.runner.lease({ payload: { harness, id: batchId } }).pipe(
        Effect.map((lease) => [harness, lease.values] as const),
        Effect.option
      )
    );

    return new Map<EvalHarness, Readonly<Record<string, string>>>(
      leased.flatMap(Option.toArray)
    );
  });

const recordedLocally = (label: string, request: StartBatchRequest) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const trigger = yield* evalTrigger;
    const started = yield* api.runner.start({
      payload: { ...request, local: true, trigger },
    });

    yield* reportStarted(label, started.id);
    yield* Effect.addFinalizer(() =>
      api.runner.finish({ payload: { id: started.id } }).pipe(Effect.ignore)
    );

    const batch = yield* api.batches.get({ payload: { id: started.id } });
    const runIdOf = yield* runIdsFor(request, started, batch);
    const leases = yield* leasesFor(request, started.id);

    return yield* runLocally(request, {
      credentials: (harness) => leases.get(harness),
      onTrial: (slot, trial) =>
        api.runner
          .report({ payload: { ...trial, runId: runIdOf(slot) } })
          .pipe(
            Effect.catchAll((error) =>
              note(
                `A trial of ${slot.caseId} on ${labelOfRequest(slot.variant)} was not recorded. ${asAnpordError(error).message}`
              )
            )
          ),
    });
  }).pipe(Effect.scoped, Effect.provide(ClientLayer));

const runSuiteLocally = (file: string, selection: Selection) =>
  Effect.gen(function* () {
    const request = yield* selectFrom(
      file,
      yield* compileEvalEffect(file),
      selection
    );
    const label = `${request.suite.name} (${file})`;
    const recorded = yield* Effect.option(apiKeyConfig);
    const cases = Option.isSome(recorded)
      ? yield* recordedLocally(label, request)
      : yield* runLocally(request);

    yield* reportLocal(label, cases);

    return localProblems(cases);
  });

export const runSuitesLocally = (
  files: readonly string[],
  selection: Selection,
  options: {
    readonly gate: EvalGate;
    readonly timeoutSeconds: Option.Option<number>;
  }
) =>
  Effect.gen(function* () {
    const problems = yield* Effect.forEach(files, (file) =>
      Option.match(options.timeoutSeconds, {
        onNone: () => runSuiteLocally(file, selection),
        onSome: (seconds) =>
          runSuiteLocally(file, selection).pipe(
            Effect.timeoutFail({
              duration: Duration.seconds(seconds),
              onTimeout: () => new LocalTimeout({ file, seconds }),
            })
          ),
      })
    );

    return yield* failWhen([], options.gate === "never" ? [] : problems.flat());
  });
