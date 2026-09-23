import { Effect } from "effect";
import { cellKeyOf, userModel, userModelOf } from "../domain/cell";
import { renderPrompt } from "../domain/prompt";
import { TrialRunner } from "../ports/trial-runner";
import { RunRepository } from "../repositories/run-repository";
import type { LiveRuns } from "./live-runs";
import { makeRegisterCases } from "./register-cases";
import { makeRegisterProfiles } from "./register-profiles";
import type { ResumeGrid, StartGrid } from "./run";
import { settleFailedRun } from "./settle-failed-run";

export const makeStartRun = (
  execute: (grid: ResumeGrid) => Effect.Effect<void>,
  live: LiveRuns
) =>
  Effect.gen(function* () {
    const runs = yield* RunRepository;
    const runner = yield* TrialRunner;
    const registerCases = yield* makeRegisterCases;
    const registerProfiles = yield* makeRegisterProfiles;

    return (input: StartGrid) =>
      Effect.gen(function* () {
        const cellCount = input.cases.length * input.variants.length;

        const created = yield* runs.insert({
          cellCount,
          executedBy: input.executedBy ?? null,
          name: input.name,
          organizationId: input.organizationId,
          startedBy: input.startedBy,
          trigger: input.trigger,
          trialCount: cellCount * input.trials,
        });

        const prepared = Effect.gen(function* () {
          const conductedBy = yield* userModel;
          const registered = yield* registerCases(input);
          const profiles = yield* registerProfiles(input);

          /* Written before handover, because an out-of-process runner rebuilds the
           grid from these rows. Idempotent, so creating them again is the same rows. */
          yield* runs.insertCells(
            input.variants.flatMap((task, variantIndex) =>
              input.cases.flatMap((subject, caseIndex) => {
                const row = registered[caseIndex];

                return row === undefined
                  ? []
                  : [
                      {
                        cellKey: cellKeyOf({
                          caseInternalId: row.caseInternalId,
                          harness: task.harness,
                          model: task.model,
                          profile: task.profile?.name ?? null,
                          provider: task.provider,
                          userModel: userModelOf(subject.user, conductedBy),
                        }),
                        harness: task.harness,
                        harnessCredentialConnectionId:
                          task.bindings?.harnessConnectionId,
                        harnessVersion: task.harnessVersion,
                        model: task.model,
                        profileInternalId:
                          profiles[variantIndex]?.internalId ?? null,
                        prompt: renderPrompt(input.prompt, subject.variables),
                        validatorFiles: subject.validator?.sourceFiles,
                        provider: task.provider,
                        runInternalId: created.internalId,
                        sandboxCredentialConnectionId:
                          task.bindings?.sandboxConnectionId,
                        caseVersionInternalId: row.internalId,
                      },
                    ];
              })
            )
          );

          if (input.executedBy == null) {
            yield* runner.dispatch({
              organizationId: input.organizationId,
              runId: created.id,
              work: execute({ created, input, registered }),
            });
          }
        });

        yield* prepared.pipe(
          Effect.onError((cause) =>
            settleFailedRun({ cause, created, live, runs })
          )
        );

        return created.id;
      }).pipe(
        /* The row is settled from here as well as from execute: everything
           between the insert and the handover can fail, and orDie takes the
           tag with it, leaving a row saying running with nobody to correct it. */
        Effect.tapErrorCause((cause) =>
          Effect.logError("grid run could not start", cause)
        ),
        Effect.orDie,
        Effect.withSpan("GridRun.start", {
          attributes: {
            cases: input.cases.length,
            variants: input.variants.length,
            trials: input.trials,
          },
        })
      );
  });
