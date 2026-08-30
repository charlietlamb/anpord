import { CredentialResolver } from "@anpord/eval/credentials/connections";
import { resolveTaskCredentials } from "@anpord/eval/credentials/tasks";
import { GridRun } from "@anpord/eval/grid/run";
import { Baselines } from "@anpord/eval/services/baselines";
import { CellReruns } from "@anpord/eval/services/cell-rerun";
import { ModelCatalogues } from "@anpord/eval/services/model-catalogue";
import { NotFound } from "@anpord/schema/domain/errors";
import { Permissions } from "@anpord/schema/domain/permissions";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { getEvalRun, listEvalRuns } from "../../evals/operations";
import { EvalCredentials } from "./credentials";
import { harnessVersion } from "./harness-version";
import {
  createPlayground,
  getPlayground,
  listPlaygrounds,
  runPlayground,
  savePlayground,
} from "./playground-handlers";
import { asReading } from "./to-api";

const HISTORY_LIMIT = 20;

export const EvalsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "evals",
  (handlers) =>
    authorized(handlers)
      .handle("list", { permission: Permissions.Evals.Read }, ({ urlParams }) =>
        listEvalRuns(urlParams)
      )

      .handle("start", { permission: Permissions.Evals.Write }, ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const credentialResolver = yield* CredentialResolver;
          const grid = yield* GridRun;
          const credentials = yield* EvalCredentials;
          const requested = yield* Effect.forEach(payload.tasks, (task) =>
            harnessVersion(task.harness).pipe(
              Effect.map((harnessVersion) => ({ ...task, harnessVersion }))
            )
          );
          const tasks = yield* resolveTaskCredentials(
            credentialResolver,
            actor,
            requested,
            credentials.codexAuth
          );

          return {
            id: yield* grid.start({
              cases: payload.cases.map((subject) => ({
                goal: subject.goal,
                name: subject.name,
                setup: subject.setup,
                source: subject.source,
                validator: subject.validator,
                verify: subject.verify,
              })),
              organizationId: actor.organizationId,
              prompt: payload.prompt,
              startedBy: null,
              tasks,
              trials: payload.trials,
            }),
          };
        }).pipe(Effect.orDie)
      )
      .handle("get", { permission: Permissions.Evals.Read }, ({ path }) =>
        getEvalRun(path.id)
      )
      .handle(
        "cellHistory",
        { permission: Permissions.Evals.Read },
        ({ path }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const baselines = yield* Baselines;

            const entries = yield* baselines.history({
              cellKey: path.cellKey,
              limit: HISTORY_LIMIT,
              organizationId: actor.organizationId,
            });

            return entries.map(asReading);
          }).pipe(Effect.catchTag("EvalStoreError", Effect.die))
      )

      .handle(
        "rerunCell",
        { permission: Permissions.Evals.Write },
        ({ path, payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const reruns = yield* CellReruns;
            const credentials = yield* EvalCredentials;

            const id = yield* reruns
              .again({
                actor,
                cellKey: path.cellKey,
                legacyHarnessAuth: credentials.codexAuth,
                organizationId: actor.organizationId,
                runId: path.id,
                startedBy: null,
                trials: payload.trials,
              })
              .pipe(
                Effect.mapError((problem) =>
                  problem._tag === "CredentialError"
                    ? new NotFound({ message: problem.message })
                    : problem
                ),
                Effect.catchTag("EvalStoreError", Effect.die),
                Effect.catchTag("NotRunnable", (problem) =>
                  Effect.fail(
                    new NotFound({ message: problem.problems.join(", ") })
                  )
                )
              );

            return { id };
          })
      )
      .handle(
        "modelCatalogue",
        { permission: Permissions.Evals.Read },
        ({ urlParams }) =>
          Effect.gen(function* () {
            const catalogues = yield* ModelCatalogues;

            return yield* catalogues.forHarness({
              harness: urlParams.harness,
              query: urlParams.q,
            });
          })
      )
      .handle("listPlaygrounds", { permission: Permissions.Evals.Read }, () =>
        listPlaygrounds()
      )
      .handle(
        "createPlayground",
        { permission: Permissions.Evals.Write },
        ({ payload }) => createPlayground(payload)
      )
      .handle(
        "getPlayground",
        { permission: Permissions.Evals.Read },
        ({ path }) => getPlayground(path.id)
      )
      .handle(
        "savePlayground",
        { permission: Permissions.Evals.Write },
        ({ path, payload }) => savePlayground(path.id, payload)
      )

      .handle(
        "runPlayground",
        { permission: Permissions.Evals.Write },
        ({ path }) => runPlayground(path.id)
      ).done
);
