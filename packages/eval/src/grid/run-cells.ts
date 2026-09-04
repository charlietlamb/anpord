import { Clock, Effect, Either, Option } from "effect";
import { SourceTokens } from "../codebase/source-token";
import { CellKey } from "../domain/cell";
import { reasonOf } from "../domain/errors";
import { RunRepository } from "../repositories/run-repository";
import { TrialCostRepository } from "../repositories/trial-cost-repository";
import { TrialRecorder } from "../repositories/trial-record";
import { AgentTrial } from "../services/agent-trial";
import { Baselines } from "../services/baselines";
import { runGridCell } from "./cell";
import { forEachGridCell } from "./for-each-cell";
import type { LiveRuns } from "./live-runs";
import type { ResumeGrid } from "./run";
import {
  advanceTrial,
  completeCell,
  settleTrial,
  type TaskProfile,
} from "./state";

/** Runs every cell of a grid, then closes the run with what became of them. */
export const makeRunCells = (live: LiveRuns) =>
  Effect.gen(function* () {
    const agent = yield* AgentTrial;
    const baselines = yield* Baselines;
    const costs = yield* TrialCostRepository;
    const recorder = yield* TrialRecorder;
    const runs = yield* RunRepository;
    const sourceTokens = yield* SourceTokens;

    return (
      { created, input, registered }: ResumeGrid,
      profiles: readonly (TaskProfile | null)[]
    ) =>
      Effect.gen(function* () {
        const sourceToken = Option.getOrUndefined(
          yield* sourceTokens.forOrganization(input.organizationId)
        );

        const outcomes = yield* forEachGridCell(
          input.cases,
          input.tasks,
          (subject, task, caseIndex, taskIndex) =>
            Effect.gen(function* () {
              const row = registered[caseIndex];

              if (row === undefined) {
                return;
              }

              const position = { caseName: subject.name, taskIndex };

              const result = yield* runGridCell({
                agent,
                costs,
                onProgress: (ordinal, journal) =>
                  live.update(created.id, (state) =>
                    advanceTrial(state, position, ordinal, journal)
                  ),
                onTrial: (ordinal, trial) =>
                  live.update(created.id, (state) =>
                    settleTrial(state, position, ordinal, trial)
                  ),
                organizationId: input.organizationId,
                profile: profiles[taskIndex] ?? null,
                prompt: input.prompt,
                recorder,
                runInternalId: created.internalId,
                runs,
                sourceToken,
                subject,
                task,
                taskInternalId: row.internalId,
                taskPublicId: row.id,
                trials: input.trials,
              });

              yield* live.update(created.id, (state) =>
                completeCell(state, position, result)
              );

              yield* baselines
                .promoteIfAbsent({
                  cellInternalId: result.internalId,
                  cellKey: CellKey.make(result.cellKey),
                  organizationId: input.organizationId,
                })
                .pipe(Effect.ignoreLogged);
            })
        );

        const finishedAt = yield* Clock.currentTimeMillis;
        const failures = outcomes.flatMap((outcome) =>
          Either.isLeft(outcome) ? [outcome.left] : []
        );
        const first = failures[0];

        yield* runs.finish({
          failure:
            first === undefined
              ? null
              : `${failures.length} of ${outcomes.length} cells could not run: ${reasonOf(first)}`,
          finishedAt: new Date(finishedAt),
          internalId: created.internalId,
          status: first === undefined ? "finished" : "failed",
        });

        yield* live.update(created.id, (state) => ({
          ...state,
          finishedAt: Option.some(finishedAt),
          status: "finished",
        }));

        yield* live.forget(created.id);
      });
  });
