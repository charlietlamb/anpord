import type { StartBatchRequest } from "@sphynx/schema/domain/eval-definition";
import type { EvalBatch, StartedBatch } from "@sphynx/schema/domain/evals";
import type { HarnessEvent } from "@sphynx/schema/domain/harness-event";
import type { Stack } from "../stack/stack";
import type { RecordedSpan, spanRecorder } from "./span-recorder";
import type { LocalTrialResult, RunnerTarget } from "./target";

export interface Observation {
  readonly cliMs: number[];
  readonly reportMs: number[];
  readonly spans: RecordedSpan[];
  readonly tokens: number[];
  readonly wallMs: number[];
}

export const emptyObservation = (): Observation => ({
  cliMs: [],
  reportMs: [],
  spans: [],
  tokens: [],
  wallMs: [],
});

const quietly = async <T>(run: () => Promise<T>) => {
  const write = process.stderr.write.bind(process.stderr);
  process.stderr.write = (() => true) as typeof process.stderr.write;
  try {
    return await run();
  } finally {
    process.stderr.write = write;
  }
};

const messageTokens = (events: readonly HarnessEvent[]) =>
  events.reduce(
    (total, event) =>
      total + (event._tag === "Message" ? (event.usage?.totalTokens ?? 0) : 0),
    0
  );

export const tokensOf = (result: LocalTrialResult) =>
  (result.kind === "scored" ? result.usage?.totalTokens : undefined) ??
  messageTokens(result.events);

export const runRecordedBatch = async (
  target: RunnerTarget,
  stack: Stack,
  request: StartBatchRequest,
  recorder: ReturnType<typeof spanRecorder>,
  observation: Observation
) => {
  const { Effect } = target.effect;
  const { call } = stack;
  const started = await call<StartedBatch>("runner.start", {
    ...request,
    checksIn: false,
    local: true,
  });
  const batch = await call<EvalBatch>("evals.batches.get", { id: started.id });
  const runIdOf = (caseId: string, model: string) => {
    const run = batch.runs.find(
      (each) => each.case.id === caseId && each.variant.model === model
    );
    if (run === undefined) {
      throw new Error(
        `Batch ${started.id} has no run for case ${caseId} on ${model}.`
      );
    }
    return run.id;
  };

  let tokens = 0;
  const began = performance.now();
  const cases = await quietly(() =>
    Effect.runPromise(
      target
        .runLocally(request, {
          onTrial: (slot, result, ordinal) =>
            Effect.promise(async () => {
              tokens += tokensOf(result);
              const sent = performance.now();
              await call(
                "runner.report",
                target.reportRequest(
                  result,
                  ordinal,
                  runIdOf(slot.caseId, slot.variant.model)
                ).payload
              );
              observation.reportMs.push(performance.now() - sent);
            }),
        })
        .pipe(Effect.withTracer(recorder.tracer))
    )
  );
  observation.wallMs.push(performance.now() - began);
  await call("runner.finish", { id: started.id });

  const failed = cases.filter((each) => each.status !== "passed");
  if (failed.length > 0) {
    throw new Error(
      `The runner bench expects every trial to pass: ${failed.map((each) => `${each.name} ${each.status} ${each.reason ?? ""}`).join("; ")}`
    );
  }
  observation.tokens.push(tokens);
  observation.spans.push(...recorder.drain());
};
