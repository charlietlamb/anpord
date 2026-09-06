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

/* Voided and `setup` trials do not count: the first is exactly the abandoned
   work a resume is for, the second is on every stored cell. */
const alive = (trial: Option.Option<AgentTrialResult>) =>
  Option.isSome(trial) && trial.value.outcome.status === "running";

const started = (run: GridRunState) =>
  run.cells.some((cell) => cell.live.size > 0 || cell.trials.some(alive));

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

    /* Judged by whether a cell started, not by the run's status: a run is marked
       running the moment it is recorded, before anyone has been handed it. */
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
