import { Clock, Effect, Option } from "effect";
import { ModelPrices } from "../ports/model-source";
import { TrialRunner } from "../ports/trial-runner";
import { RunRepository } from "../repositories/run-repository";
import type { LiveRuns } from "./live-runs";
import type { ResumeGrid } from "./run";
import { makeRunCells } from "./run-cells";

export const makeExecuteRun = (live: LiveRuns) =>
  Effect.gen(function* () {
    /* Taken once and provided to the forked run below, so pricing stays a
       detail of executing a grid rather than something every caller of
       `start` has to hold. */
    const prices = yield* ModelPrices;
    const runs = yield* RunRepository;
    const runner = yield* TrialRunner;
    const runCells = yield* makeRunCells(live);

    /* Reopening and publishing belong here rather than beside the dispatch:
       whoever executes the grid is the process that must claim the run, and
       when a worker executes it the dispatcher is a different machine that has
       already returned. */
    const claimed = (grid: ResumeGrid) =>
      Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis;

        /* The row says failed, because the sweep that closed it is why anybody
           is continuing it. Executing against that leaves a run in flight that
           every reader sees as finished. */
        yield* runs.reopen({ internalId: grid.created.internalId });

        /* Live updates are dropped for an id the map does not hold, so without
           this every trial's progress goes nowhere, and the guard against
           continuing a running run never sees one running. */
        yield* live.publish({
          cases: grid.input.cases.map((subject) => subject.name),
          cells: [],
          failure: Option.none(),
          finishedAt: Option.none(),
          id: grid.created.id,
          name: grid.input.name,
          organizationId: grid.input.organizationId,
          startedAt,
          status: "running",
          tasks: grid.input.tasks.map(
            ({ bindings: _, credentials: __, ...task }) => task
          ),
        });

        yield* runCells(grid);
      });

    const execute = (grid: ResumeGrid) =>
      claimed(grid).pipe(
        Effect.provideService(ModelPrices, prices),
        Effect.annotateLogs({ runId: grid.created.id }),
        /* Logged before it becomes a defect, for the reason start gives: the
           tag is lost through orDie, and this runs detached, where nothing is
           left to report what went wrong. */
        Effect.tapErrorCause((cause) =>
          Effect.logError("grid run could not resume", cause)
        ),
        Effect.orDie
      );

    const resume = (grid: ResumeGrid) =>
      Effect.gen(function* () {
        yield* runner.dispatch({
          organizationId: grid.input.organizationId,
          runId: grid.created.id,
          work: execute(grid),
        });
      }).pipe(
        Effect.tapErrorCause((cause) =>
          Effect.logError("grid run could not be resumed", cause)
        ),
        Effect.orDie,
        Effect.withSpan("GridRun.resume", {
          attributes: { runId: grid.created.id },
        })
      );

    return { execute, resume };
  });
