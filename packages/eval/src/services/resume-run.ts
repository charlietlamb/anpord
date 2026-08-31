import type { Actor } from "@anpord/schema/domain/actor";
import { Context, Effect, Layer, Option } from "effect";
import { CredentialResolver } from "../credentials/connections";
import type { CredentialError } from "../credentials/errors";
import { resolveTaskCredentials } from "../credentials/tasks";
import { type EvalStoreError, NotRunnable } from "../domain/errors";
import { caseFrom, taskFrom } from "../grid/from-stored";
import { GridRun, type ResumeGrid } from "../grid/run";
import { RunQuery } from "../repositories/run-query";

export interface ResumeRun {
  readonly actor: Actor;
  readonly legacyHarnessAuth: string;
  readonly runId: string;
}

export interface ResumeRunsShape {
  readonly resume: (
    input: ResumeRun
  ) => Effect.Effect<void, CredentialError | EvalStoreError | NotRunnable>;
}

export class ResumeRuns extends Context.Tag("@anpord/eval/ResumeRuns")<
  ResumeRuns,
  ResumeRunsShape
>() {}

export const ResumeRunsLive = Layer.effect(
  ResumeRuns,
  Effect.gen(function* () {
    const credentials = yield* CredentialResolver;
    const grid = yield* GridRun;
    const query = yield* RunQuery;

    const rebuild = Effect.fn("ResumeRuns.rebuild")(function* (
      input: ResumeRun
    ) {
      const live = yield* grid.get(input.actor.organizationId, input.runId);

      /* A run already executing has a fiber per cell. Resuming it would start a
         second set against the same rows, so both write trials to one cell and
         whichever finishes last decides what the run says. */
      if (Option.isSome(live) && live.value.status === "running") {
        return yield* new NotRunnable({
          id: input.runId,
          problems: ["that run is already running"],
        });
      }

      const cells = yield* query.findRunTasks({
        organizationId: input.actor.organizationId,
        runId: input.runId,
      });

      const [first] = cells;

      if (first === undefined) {
        return yield* new NotRunnable({
          id: input.runId,
          problems: ["that run has no cells to resume"],
        });
      }

      const tasks = yield* resolveTaskCredentials(
        credentials,
        input.actor,
        cells.map(taskFrom),
        input.legacyHarnessAuth
      );

      return {
        created: {
          id: input.runId,
          internalId: first.cell.runInternalId,
        },
        input: {
          cases: cells.map(caseFrom),
          organizationId: input.actor.organizationId,
          prompt: first.prompt,
          startedBy: null,
          tasks,
          trials: 1,
        },
        registered: cells.map((subject) => ({
          id: subject.identity,
          internalId: subject.cell.taskInternalId,
        })),
      } satisfies ResumeGrid;
    });

    return ResumeRuns.of({
      resume: (input) =>
        rebuild(input).pipe(
          Effect.flatMap(grid.resume),
          Effect.annotateLogs({
            organizationId: input.actor.organizationId,
            runId: input.runId,
          })
        ),
    });
  })
);
