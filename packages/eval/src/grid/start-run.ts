import { Effect } from "effect";
import { cellKeyOf } from "../domain/cell";
import { renderPrompt } from "../domain/prompt";
import { TrialRunner } from "../ports/trial-runner";
import { RunRepository } from "../repositories/run-repository";
import { makeRegisterCases } from "./register-cases";
import { makeRegisterProfiles } from "./register-profiles";
import type { ResumeGrid, StartGrid } from "./run";

export const makeStartRun = (
  execute: (grid: ResumeGrid) => Effect.Effect<void>
) =>
  Effect.gen(function* () {
    const runs = yield* RunRepository;
    const runner = yield* TrialRunner;
    const registerCases = yield* makeRegisterCases;
    const registerProfiles = yield* makeRegisterProfiles;

    return (input: StartGrid) =>
      Effect.gen(function* () {
        const cellCount = input.cases.length * input.tasks.length;

        const created = yield* runs.insert({
          cellCount,
          name: input.name,
          organizationId: input.organizationId,
          startedBy: input.startedBy,
          trialCount: cellCount * input.trials,
        });

        const registered = yield* registerCases(input);
        const profiles = yield* registerProfiles(input);

        /* Written before handover, because an out-of-process runner rebuilds the
           grid from these rows. Idempotent, so creating them again is the same rows. */
        yield* runs.insertCells(
          input.tasks.flatMap((task, taskIndex) =>
            input.cases.flatMap((subject, caseIndex) => {
              const row = registered[caseIndex];

              return row === undefined
                ? []
                : [
                    {
                      cellKey: cellKeyOf({
                        harness: task.harness,
                        model: task.model,
                        profile: task.profile?.name ?? null,
                        provider: task.provider,
                        taskId: row.id,
                        taskVersion: row.internalId,
                      }),
                      harness: task.harness,
                      harnessCredentialConnectionId:
                        task.bindings?.harnessConnectionId,
                      harnessVersion: task.harnessVersion,
                      model: task.model,
                      profileInternalId:
                        profiles[taskIndex]?.internalId ?? null,
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
