import { Clock, Effect, Option } from "effect";
import { cellKeyOf } from "../domain/cell";
import { renderPrompt } from "../domain/prompt";
import { TrialRunner } from "../ports/trial-runner";
import { RunRepository } from "../repositories/run-repository";
import type { LiveRuns } from "./live-runs";
import { makeRegisterCases } from "./register-cases";
import type { ResumeGrid, StartGrid } from "./run";
import type { GridCell } from "./state";
import { WORKSPACE } from "./trial";

export const makeStartRun = (
  live: LiveRuns,
  execute: (grid: ResumeGrid) => Effect.Effect<void>
) =>
  Effect.gen(function* () {
    const runs = yield* RunRepository;
    const runner = yield* TrialRunner;
    const registerCases = yield* makeRegisterCases;

    return (input: StartGrid) =>
      Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis;
        const cellCount = input.cases.length * input.tasks.length;

        const created = yield* runs.insert({
          cellCount,
          name: input.name,
          organizationId: input.organizationId,
          startedBy: input.startedBy,
          trialCount: cellCount * input.trials,
        });

        const registered = yield* registerCases(input);

        const cells = input.tasks.flatMap((_, taskIndex) =>
          input.cases.map(
            (subject): GridCell => ({
              caseName: subject.name,
              cellKey: null,
              distribution: Option.none(),
              internalId: null,
              live: new Map(),
              setup: Option.some({
                prompt: renderPrompt(input.prompt, subject.variables),
                repoRef:
                  subject.source.kind === "repo" ? subject.source.ref : null,
                repoUrl:
                  subject.source.kind === "repo" ? subject.source.url : null,
                prepareName: subject.prepare?.name ?? null,
                validatorName: subject.validator?.name ?? null,
                verifyCommand: subject.verify,
                workspace: WORKSPACE,
              }),
              status: "running",
              taskIndex,
              trials: Array.from({ length: input.trials }, () => Option.none()),
            })
          )
        );

        yield* live.publish({
          cases: input.cases.map((subject) => subject.name),
          cells,
          failure: Option.none(),
          finishedAt: Option.none(),
          id: created.id,
          name: input.name,
          organizationId: input.organizationId,
          startedAt,
          status: "running",
          tasks: input.tasks.map(
            ({ bindings: _, credentials: __, ...task }) => task
          ),
        });

        /* Written before the run is handed over, because a runner that is not
           this process rebuilds the grid from these rows. They used to be
           created by the work itself, so a run dispatched elsewhere arrived at
           a worker that could find nothing to do. Idempotent, so the work
           creating them again is the same rows. */
        yield* runs.insertCells(
          input.tasks.flatMap((task) =>
            input.cases.flatMap((subject, caseIndex) => {
              const row = registered[caseIndex];

              return row === undefined
                ? []
                : [
                    {
                      cellKey: cellKeyOf({
                        harness: task.harness,
                        model: task.model,
                        provider: task.provider,
                        taskId: row.id,
                        taskVersion: row.internalId,
                      }),
                      harness: task.harness,
                      harnessCredentialConnectionId:
                        task.bindings?.harnessConnectionId,
                      harnessVersion: task.harnessVersion,
                      model: task.model,
                      prompt: renderPrompt(input.prompt, subject.variables),
                      provider: task.provider,
                      runInternalId: created.internalId,
                      sandboxCredentialConnectionId:
                        task.bindings?.sandboxConnectionId,
                      taskInternalId: row.internalId,
                    },
                  ];
            })
          )
        );

        yield* runner.dispatch({
          organizationId: input.organizationId,
          runId: created.id,
          work: execute({ created, input, registered }),
        });

        return created.id;
      }).pipe(
        /* Logged before it is turned into a defect: a start that fails takes
           its tag with it through orDie, and a run row saying only "failed"
           is the whole of what anybody could see. */
        Effect.tapErrorCause((cause) =>
          Effect.logError("grid run could not start", cause)
        ),
        Effect.orDie,
        Effect.withSpan("GridRun.start", {
          attributes: {
            cases: input.cases.length,
            tasks: input.tasks.length,
            trials: input.trials,
          },
        })
      );
  });
