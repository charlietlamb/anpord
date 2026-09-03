import { Effect, Option } from "effect";
import type { CredentialError } from "../credentials/errors";
import type { CredentialResolverShape } from "../credentials/resolver";
import { type EvalStoreError, NotRunnable } from "../domain/errors";
import type { RunQueryShape } from "../repositories/run-query";
import type { AgentTrialResult } from "../services/agent-trial";
import { caseFrom } from "./from-stored";
import {
  type CredentialSource,
  tasksWithCredentials,
} from "./resume-credentials";
import type { GridRunShape, ResumeGrid } from "./run";
import type { GridRunState } from "./state";
import { gridOf } from "./stored-grid";

/**
 * Whether a trial is on this run that somebody is still working on.
 *
 * Not merely whether a trial exists. A run carries every trial it has ever
 * had, and one the sweep voided is exactly the abandoned work a resume is for,
 * so counting those meant a run could be picked up once and never again.
 *
 * Not `setup` either: a stored cell always has one, being the case's own
 * description rather than evidence of anything running.
 */
const alive = (trial: Option.Option<AgentTrialResult>) =>
  Option.isSome(trial) && trial.value.outcome.status === "running";

const started = (run: GridRunState) =>
  run.cells.some((cell) => cell.live.size > 0 || cell.trials.some(alive));

/**
 * The grid a stored run was, ready to be executed again.
 *
 * Shared by the two things that continue a run: the api, where a person asked,
 * and a worker, which was handed the id. They differ only in how credentials
 * are read, which is what CredentialSource carries.
 */
export const rebuildRun = (
  services: {
    readonly credentials: CredentialResolverShape;
    readonly grid: GridRunShape;
    readonly query: RunQueryShape;
  },
  input: {
    readonly organizationId: string;
    readonly runId: string;
    readonly source: CredentialSource;
  }
): Effect.Effect<ResumeGrid, CredentialError | EvalStoreError | NotRunnable> =>
  Effect.gen(function* () {
    const live = yield* services.grid.get(input.organizationId, input.runId);

    /* A run with work under way already has a fiber per cell, and a second set
       against the same rows would have both writing trials to one cell.

       Judged by whether a cell has started rather than by the run's status: a
       run is marked running the moment it is recorded, which is before anyone
       has been handed it, so the status alone would refuse the very handoff
       this exists to protect. */
    if (Option.isSome(live) && started(live.value)) {
      return yield* new NotRunnable({
        id: input.runId,
        problems: ["that run is already being worked on"],
      });
    }

    const cells = yield* services.query.findRunTasks({
      organizationId: input.organizationId,
      runId: input.runId,
    });

    const [first] = cells;

    if (first === undefined) {
      return yield* new NotRunnable({
        id: input.runId,
        problems: ["that run has no cells to continue"],
      });
    }

    const rebuilt = gridOf(cells);

    const tasks = yield* tasksWithCredentials(
      services.credentials,
      input.organizationId,
      input.source,
      rebuilt.tasks
    );

    return {
      created: { id: input.runId, internalId: first.cell.runInternalId },
      input: {
        cases: rebuilt.cases.map(caseFrom),
        name: first.runName,
        organizationId: input.organizationId,
        prompt: first.prompt,
        startedBy: null,
        tasks,
        trials: 1,
      },
      /* Indexed by case, because that is how the grid reads it: one entry per
         case, not per cell. */
      registered: rebuilt.cases.map((subject) => ({
        id: subject.identity,
        internalId: subject.cell.taskInternalId,
      })),
    } satisfies ResumeGrid;
  }).pipe(
    Effect.withSpan("Grid.rebuildRun", { attributes: { runId: input.runId } }),
    Effect.annotateLogs({
      organizationId: input.organizationId,
      runId: input.runId,
    })
  );
