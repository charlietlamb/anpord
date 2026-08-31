import type { Actor } from "@anpord/schema/domain/actor";
import { Context, Effect, Layer } from "effect";
import { CredentialResolver } from "../credentials/connections";
import type { CredentialError } from "../credentials/errors";
import { resolveTaskCredentials } from "../credentials/tasks";
import { type EvalStoreError, NotRunnable } from "../domain/errors";
import { caseFrom, taskFrom } from "../grid/from-stored";
import { GridRun } from "../grid/run";
import { RunQuery } from "../repositories/run-query";

export interface ResumeRun {
  readonly actor: Actor;
  readonly legacyHarnessAuth: string;
  readonly runId: string;
}

export interface ResumeRunsShape {
  readonly resume: (
    input: ResumeRun
  ) => Effect.Effect<string, CredentialError | EvalStoreError | NotRunnable>;
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

    const resume = Effect.fn("ResumeRuns.resume")(function* (input: ResumeRun) {
      const cells = yield* query.findRunTasks({
        organizationId: input.actor.organizationId,
        runId: input.runId,
      });

      if (cells.length === 0) {
        return yield* new NotRunnable({
          id: input.runId,
          problems: ["that run has nothing left to do"],
        });
      }

      const tasks = yield* resolveTaskCredentials(
        credentials,
        input.actor,
        cells.map(taskFrom),
        input.legacyHarnessAuth
      );

      const [first] = cells;

      return yield* grid.start({
        cases: cells.map(caseFrom),
        organizationId: input.actor.organizationId,
        prompt: first?.prompt ?? "",
        startedBy: null,
        tasks,
        trials: 1,
      });
    });

    return ResumeRuns.of({ resume });
  })
);
