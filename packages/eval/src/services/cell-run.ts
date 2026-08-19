import { Clock, Context, Effect, Layer, Option } from "effect";
import { type CellKey, cellKeyOf } from "../domain/cell";
import type { Distribution } from "../domain/distribution";
import type {
  EvalStoreError,
  HarnessUnavailable,
  SandboxUnavailable,
} from "../domain/errors";
import { TaskNotFound } from "../domain/errors";
import { EventRepository } from "../repositories/event-repository";
import { RunRepository } from "../repositories/run-repository";
import { TaskRepository } from "../repositories/task-repository";
import { TrialRepository } from "../repositories/trial-repository";
import { AgentTrial, type AgentTrialRequest } from "./agent-trial";
import { runAgentTrialSet } from "./agent-trial-set";
import type { WorkspaceSource } from "./workspace";

export interface CellRunRequest {
  readonly agent: Omit<
    AgentTrialRequest,
    "setupCommand" | "source" | "verifyCommand" | "workspace"
  >;
  readonly concurrency: number;
  readonly organizationId: string;
  readonly source: WorkspaceSource;
  readonly startedBy: string | null;
  readonly taskId: string;
  readonly trials: number;
}

export interface CellRunResult {
  readonly cellKey: CellKey;
  readonly distribution: Distribution;
  readonly runId: string;
}

export interface CellRunShape {
  /** Runs one cell and records it, so a result survives the process that
   * produced it. Everything a report shows is read back from here rather than
   * held in memory. */
  readonly run: (
    request: CellRunRequest
  ) => Effect.Effect<
    CellRunResult,
    EvalStoreError | HarnessUnavailable | SandboxUnavailable | TaskNotFound
  >;
}

export class CellRun extends Context.Tag("@anpord/eval/CellRun")<
  CellRun,
  CellRunShape
>() {}

export const CellRunLive = Layer.effect(
  CellRun,
  Effect.gen(function* () {
    const events = yield* EventRepository;
    const runs = yield* RunRepository;
    const tasks = yield* TaskRepository;
    const trials = yield* TrialRepository;
    const agent = yield* AgentTrial;

    const run = (request: CellRunRequest) =>
      Effect.gen(function* () {
        const found = yield* tasks.findById(
          request.organizationId,
          request.taskId
        );

        /* A missing task is the caller asking for something that does not
           exist, not a provider failing. Collapsing the two would put it on
           the retried side of the boundary and an unregistered task would be
           retried until the run gave up. */
        if (Option.isNone(found)) {
          return yield* Effect.fail(new TaskNotFound({ id: request.taskId }));
        }

        const task = found.value;

        const cellKey = cellKeyOf({
          harness: request.agent.harness,
          harnessVersion: request.agent.harnessVersion,
          model: request.agent.model,
          provider: request.agent.provider,
          taskId: task.id,
          taskVersion: task.internalId,
        });

        const created = yield* runs.insert({
          cellCount: 1,
          organizationId: request.organizationId,
          startedBy: request.startedBy,
          trialCount: request.trials,
        });

        const cell = yield* runs.insertCell({
          cellKey,
          harness: request.agent.harness,
          harnessVersion: request.agent.harnessVersion,
          model: request.agent.model,
          provider: request.agent.provider,
          runInternalId: created.internalId,
          taskInternalId: task.internalId,
        });

        const outcome = yield* runAgentTrialSet(agent, {
          ...request.agent,
          concurrency: request.concurrency,
          source: request.source,
          setupCommand: task.setupCommand,
          trials: request.trials,
          verifyCommand: task.verifyCommand,
          workspace: task.workspace,
        });

        const settledAt = yield* Clock.currentTimeMillis;
        const finishedAt = new Date(settledAt);

        /* Each trial is written with its own journal, so an exit code stays
           recoverable after the sandbox is gone. The ordinal is the trial's
           identity within the cell and comes from its position, since trials
           run concurrently and finish in no particular order.

           Each trial's start is derived from its own measured duration rather
           than from one shared timestamp: trials run concurrently and take
           different lengths of time, so a single value would record every one
           as having started and finished at the same instant. */
        yield* Effect.forEach(
          outcome.trials,
          (result, index) =>
            Effect.gen(function* () {
              const row = yield* trials.insert({
                cellInternalId: cell.internalId,
                ordinal: index + 1,
                provider: request.agent.provider,
              });

              const took = result.outcome.modelMs + result.outcome.sandboxMs;

              yield* trials.claim(
                row.internalId,
                result.sandboxId,
                new Date(settledAt - took)
              );
              yield* trials.settle({
                attempt: 1,
                finishedAt,
                internalId: row.internalId,
                outcome: result.outcome,
              });

              yield* events.append({
                events: result.events,
                trialInternalId: row.internalId,
              });
            }),
          { discard: true }
        );

        yield* runs.finish(created.internalId, finishedAt);

        return {
          cellKey,
          distribution: outcome.distribution,
          runId: created.id,
        } satisfies CellRunResult;
      }).pipe(
        Effect.withSpan("CellRun.run", {
          attributes: {
            harness: request.agent.harness,
            provider: request.agent.provider,
            trials: request.trials,
          },
        }),
        Effect.annotateLogs({
          organizationId: request.organizationId,
          taskId: request.taskId,
        })
      );

    return CellRun.of({ run });
  })
);
