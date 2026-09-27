import {
  LOCAL_BEAT_EVERY,
  LOCAL_QUIET_AFTER,
} from "@anpord/eval/domain/local-heartbeat";
import { harnessesNeeded } from "@anpord/eval/domain/suite-harnesses";
import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import type { EvalHarness, StartedBatch } from "@anpord/schema/domain/evals";
import { AnpordApi, type AnpordClient } from "@anpord/schema/public/client";
import { IdempotencyKey } from "@anpord/schema/public/runner-api";
import {
  Array as Arr,
  Cause,
  Data,
  Duration,
  Effect,
  Exit,
  Option,
  Random,
  Schedule,
} from "effect";
import { webUrlConfig } from "../client/config";
import { asAnpordError } from "../client/errors";
import { labelOfRequest, runLocally } from "./eval-local";
import { reportStarted } from "./eval-report";
import { evalTrigger } from "./eval-trigger";
import { batchUrl } from "./github-check";
import { runIdsFor } from "./local-run-ids";
import {
  type LocalTrialResult,
  type ReportRequest,
  reportRequest,
  unscoredForOlderServer,
} from "./local-trial-result";
import { openBrowser } from "./open-browser";
import { note } from "./render";
import { retryTransient } from "./transient";

const leasesFor = (request: StartBatchRequest, batchId: string) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const leased = yield* Effect.forEach(harnessesNeeded(request), (harness) =>
      retryTransient(
        api.runner.lease({ payload: { harness, id: batchId } })
      ).pipe(
        Effect.map((lease) => [harness, lease.values] as const),
        Effect.option
      )
    );

    return new Map<EvalHarness, Readonly<Record<string, string>>>(
      leased.flatMap(Option.toArray)
    );
  });

const CLOSED_BATCH = 409;

const finishBatch = (batchId: string) =>
  AnpordApi.pipe(
    Effect.flatMap((api) =>
      retryTransient(api.runner.finish({ payload: { id: batchId } }))
    ),
    Effect.map((batch) => batch.costs),
    Effect.catchAll((error) => {
      const refused = asAnpordError(error);

      return note(
        refused.status === CLOSED_BATCH
          ? refused.message
          : `Batch ${batchId} was not closed. Anpord marks it failed ${Duration.toMinutes(LOCAL_QUIET_AFTER)} minutes after this machine stops checking in. ${refused.message}`
      ).pipe(Effect.as(null));
    })
  );

const startKey = Effect.map(
  Effect.all(Arr.makeBy(4, () => Random.nextIntBetween(0, 2 ** 32))),
  (words) =>
    IdempotencyKey.make(
      words.map((word) => word.toString(16).padStart(8, "0")).join("")
    )
);

const openBatch = (request: StartBatchRequest) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const trigger = yield* evalTrigger;
    const key = yield* startKey;

    return yield* Effect.acquireRelease(
      retryTransient(
        api.runner.start({
          headers: { "idempotency-key": key },
          payload: { ...request, checksIn: true, local: true, trigger },
        })
      ),
      (started, exit) =>
        Exit.isSuccess(exit) || closedBy(exit)
          ? Effect.void
          : Effect.asVoid(finishBatch(started.id))
    );
  });

class BatchClosed extends Data.TaggedError("BatchClosed")<{
  readonly message: string;
}> {}

const closedBy = (exit: Exit.Exit<unknown, unknown>) =>
  Exit.isFailure(exit) &&
  Option.exists(
    Cause.failureOption(exit.cause),
    (error) => error instanceof BatchClosed
  );

const untilClosed = (batchId: string) =>
  AnpordApi.pipe(
    Effect.flatMap((api) => api.runner.beat({ payload: { id: batchId } })),
    Effect.catchAll((error) => {
      const refused = asAnpordError(error);

      return refused.status === CLOSED_BATCH
        ? Effect.fail(new BatchClosed({ message: refused.message }))
        : Effect.void;
    }),
    Effect.repeat(Schedule.spaced(LOCAL_BEAT_EVERY)),
    Effect.zipRight(Effect.never)
  );

const reportTrial = (
  api: AnpordClient,
  result: LocalTrialResult,
  ordinal: number,
  runId: string
) => {
  const send = (request: ReportRequest) =>
    retryTransient(api.runner.report(request));

  return send(reportRequest(result, ordinal, runId)).pipe(
    Effect.catchTag("HttpApiDecodeError", (refused) =>
      result.kind === "broken"
        ? send(unscoredForOlderServer(result, ordinal, runId))
        : Effect.fail(refused)
    )
  );
};

const recordInto = (
  label: string,
  request: StartBatchRequest,
  ui: boolean,
  started: StartedBatch
) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const link = batchUrl(yield* webUrlConfig, started.id);

    yield* reportStarted(label, started.id);

    if (ui) {
      yield* openBrowser(link);
    }

    const batch = yield* retryTransient(
      api.batches.get({ payload: { id: started.id } })
    );
    const runIdOf = yield* runIdsFor(request, started, batch);
    const leases = yield* leasesFor(request, started.id);

    const cases = yield* runLocally(request, {
      credentials: leases,
      onTrial: (slot, result, ordinal) =>
        reportTrial(api, result, ordinal, runIdOf(slot)).pipe(
          Effect.catchAll((error) =>
            note(
              `A trial of ${slot.caseId} on ${labelOfRequest(slot.variant)} was not recorded, so it shows as void. ${asAnpordError(error).message}`
            )
          )
        ),
    });

    return {
      cases,
      costs: yield* finishBatch(started.id),
      link: Option.some(link),
    };
  });

export const runRecorded = (
  label: string,
  request: StartBatchRequest,
  ui: boolean
) =>
  Effect.gen(function* () {
    const started = yield* openBatch(request);

    return yield* Effect.raceFirst(
      recordInto(label, request, ui, started),
      untilClosed(started.id)
    );
  }).pipe(Effect.scoped);
