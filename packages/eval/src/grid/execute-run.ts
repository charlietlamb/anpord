import { Clock, Effect, Option } from "effect";
import { ModelPrices } from "../ports/model-source";
import { TrialRunner } from "../ports/trial-runner";
import { RunRepository } from "../repositories/run-repository";
import type { LiveRuns } from "./live-runs";
import { makeRegisterProfiles } from "./register-profiles";
import type { ResumeGrid } from "./run";
import { makeRunCells } from "./run-cells";
import { projectTask } from "./state";

export const makeExecuteRun = (live: LiveRuns) =>
  Effect.gen(function* () {
    /* Taken once and provided to the forked run, so no caller of `start` holds it. */
    const prices = yield* ModelPrices;
    const runs = yield* RunRepository;
    const runner = yield* TrialRunner;
    const runCells = yield* makeRunCells(live);
    const registerProfiles = yield* makeRegisterProfiles;

    /* Whoever executes the grid must claim the run: the dispatcher may be another
       machine that has already returned. */
    const claimed = (grid: ResumeGrid) =>
      Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis;

        /* A worker rebuilds from stored rows; the content hash finds the same ones. */
        const profiles = yield* registerProfiles(grid.input);

        /* The sweep closed this row, and executing against it would leave a live
           run every reader sees as finished. */
        yield* runs.reopen({ internalId: grid.created.internalId });

        /* Updates for an id the map does not hold are dropped. */
        yield* live.publish({
          cases: grid.input.cases.map((subject) => subject.name),
          cells: [],
          failure: Option.none(),
          finishedAt: Option.none(),
          id: grid.created.id,
          name: grid.input.name,
          trigger: grid.input.trigger ?? null,
          organizationId: grid.input.organizationId,
          startedAt,
          status: "running",
          tasks: grid.input.tasks.map((task, taskIndex) =>
            projectTask(task, profiles[taskIndex] ?? null)
          ),
        });

        yield* runCells(grid, profiles);
      });

    const execute = (grid: ResumeGrid) =>
      claimed(grid).pipe(
        Effect.provideService(ModelPrices, prices),
        Effect.annotateLogs({ runId: grid.created.id }),
        /* Logged before `orDie` loses the tag: this runs detached, with nothing
           left to report it. */
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
