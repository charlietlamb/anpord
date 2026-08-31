import { Context, Effect, Layer, Option } from "effect";
import { CredentialResolver } from "../credentials/connections";
import type { CredentialError } from "../credentials/errors";
import { type EvalStoreError, NotRunnable } from "../domain/errors";
import { caseFrom, gridOf } from "../grid/from-stored";
import { GridRun, type ResumeGrid } from "../grid/run";
import type { GridExecutionTask } from "../grid/state";
import type { CellTask } from "../repositories/run-query";
import { RunQuery } from "../repositories/run-query";

export interface ContinueRun {
  readonly organizationId: string;
  readonly runId: string;
}

export interface ContinueRunsShape {
  readonly build: (
    input: ContinueRun
  ) => Effect.Effect<
    ResumeGrid,
    CredentialError | EvalStoreError | NotRunnable
  >;
}

export class ContinueRuns extends Context.Tag("@anpord/eval/ContinueRuns")<
  ContinueRuns,
  ContinueRunsShape
>() {}

/**
 * Rebuilds a run from what was stored, for a worker that has no session.
 *
 * The difference from ResumeRuns is the absence of an actor. A worker is not
 * deciding whether this run may use these credentials; a person with a session
 * decided that when the run was started, and the cells record what they chose.
 * Re-checking it here would ask a question nobody is present to answer, and the
 * only way to answer it would be to invent the user who is not.
 */
export const ContinueRunsLive = Layer.effect(
  ContinueRuns,
  Effect.gen(function* () {
    const credentials = yield* CredentialResolver;
    const grid = yield* GridRun;
    const query = yield* RunQuery;

    const boundTask = (organizationId: string) =>
      Effect.fn("ContinueRuns.task")(function* (subject: CellTask) {
        const harnessId = subject.cell.harnessCredentialConnectionId;

        if (harnessId === null) {
          return yield* new NotRunnable({
            id: subject.identity,
            problems: [
              "that cell recorded no harness credential to continue with",
            ],
          });
        }

        const harness = yield* credentials.resolveBound({
          connectionId: harnessId,
          organizationId,
        });

        const sandboxId = subject.cell.sandboxCredentialConnectionId;

        const sandbox =
          sandboxId === null
            ? undefined
            : yield* credentials.resolveBound({
                connectionId: sandboxId,
                organizationId,
              });

        return {
          bindings: {
            harnessConnectionId: harnessId,
            sandboxConnectionId: sandboxId ?? undefined,
          },
          credentials: {
            harness,
            ...(sandbox === undefined ? {} : { sandbox }),
          },
          harness: subject.cell.harness,
          harnessVersion: subject.cell.harnessVersion,
          model: subject.cell.model,
          provider: subject.cell.provider,
        } as GridExecutionTask;
      });

    const build = Effect.fn("ContinueRuns.build")(function* (
      input: ContinueRun
    ) {
      const live = yield* grid.get(input.organizationId, input.runId);

      if (Option.isSome(live) && live.value.status === "running") {
        return yield* new NotRunnable({
          id: input.runId,
          problems: ["that run is already running"],
        });
      }

      const cells = yield* query.findRunTasks({
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

      const tasks = yield* Effect.forEach(
        rebuilt.tasks,
        boundTask(input.organizationId)
      );

      return {
        created: { id: input.runId, internalId: first.cell.runInternalId },
        input: {
          cases: rebuilt.cases.map(caseFrom),
          organizationId: input.organizationId,
          prompt: first.prompt,
          startedBy: null,
          tasks,
          trials: 1,
        },
        registered: rebuilt.cases.map((subject) => ({
          id: subject.identity,
          internalId: subject.cell.taskInternalId,
        })),
      } satisfies ResumeGrid;
    });

    return ContinueRuns.of({ build });
  })
);
