import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import type { EvalBatch, StartedBatch } from "@anpord/schema/domain/evals";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { callV1 } from "../stack/api";
import type { Stack } from "../stack/stack";
import type { RecordedSpan, spanRecorder } from "./span-recorder";
import type { RunnerTarget } from "./target";

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

const tokensIn = (events: readonly HarnessEvent[]) =>
  events.reduce(
    (total, event) =>
      total + (event._tag === "Message" ? (event.usage?.totalTokens ?? 0) : 0),
    0
  );

export const runRecordedBatch = async (
  target: RunnerTarget,
  stack: Stack,
  request: StartBatchRequest,
  recorder: ReturnType<typeof spanRecorder>,
  observation: Observation
) => {
  const { Effect } = target.effect;
  const call = <Body>(endpoint: string, payload: unknown) =>
    callV1<Body>(stack.server.baseUrl, stack.tenant.apiKey, endpoint, payload);
  const started = await call<StartedBatch>("runner.start", {
    ...request,
    checksIn: false,
    local: true,
  });
  const batch = await call<EvalBatch>("evals.batches.get", { id: started.id });
  const runIdOf = (caseId: string, model: string) =>
    batch.runs.find(
      (run) => run.case.id === caseId && run.variant.model === model
    )?.id ?? "";

  let tokens = 0;
  const began = performance.now();
  const cases = await quietly(() =>
    Effect.runPromise(
      target
        .runLocally(request, {
          onTrial: (slot, result, ordinal) =>
            Effect.promise(async () => {
              tokens += tokensIn(result.events);
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
