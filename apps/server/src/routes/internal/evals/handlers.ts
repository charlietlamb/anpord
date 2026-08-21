import { Baselines } from "@anpord/eval/services/baselines";
import { GridRun } from "@anpord/eval/services/grid-run";
import { Conflict, NotFound } from "@anpord/schema/domain/errors";
import { Permissions } from "@anpord/schema/domain/permissions";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { DateTime, Effect, Option, Redacted } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { EvalCredentials } from "./credentials";
import { harnessVersion } from "./harness-version";
import {
  createPlayground,
  getPlayground,
  listPlaygrounds,
  runPlayground,
  savePlayground,
} from "./playground-handlers";
import { detail, summarise } from "./to-api";

export const EvalsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "evals",
  (handlers) =>
    authorized(handlers)
      .handle("list", { permission: Permissions.Evals.Read }, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const grid = yield* GridRun;
          const runs = yield* grid.list(actor.organizationId);

          return runs.map(summarise);
        })
      )
      /* Running an eval spends real money on sandboxes and model tokens, so it
         needs the write permission rather than the read one. */
      .handle("start", { permission: Permissions.Evals.Write }, ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const grid = yield* GridRun;
          const credentials = yield* EvalCredentials;
          const version = yield* harnessVersion;

          return {
            id: yield* grid.start({
              cases: payload.cases.map((subject) => ({
                goal: subject.goal,
                name: subject.name,
                setup: subject.setup,
                source: subject.source,
                verify: subject.verify,
              })),
              credentials: Redacted.make(credentials.codexAuth),
              organizationId: actor.organizationId,
              prompt: payload.prompt,
              startedBy: null,
              tasks: payload.tasks.map((task) => ({
                harness: task.harness,
                harnessVersion: version,
                model: task.model,
                provider: task.provider,
              })),
              trials: payload.trials,
            }),
          };
        }).pipe(Effect.orDie)
      )
      .handle("get", { permission: Permissions.Evals.Read }, ({ path }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const baselines = yield* Baselines;
          const grid = yield* GridRun;

          const found = yield* grid.get(actor.organizationId, path.id);

          if (Option.isNone(found)) {
            return yield* Effect.fail(
              new NotFound({ message: `No eval run with id "${path.id}"` })
            );
          }

          /* Compared here rather than by the client. A grid without its
             verdicts is a table of numbers, and deciding whether one differs
             from an accepted reading is the product. */
          /* A store failure is not "no regressions". Succeeding with an
             empty list rendered the product's core signal as absent and
             indistinguishable from a clean run. */
          const comparisons = yield* baselines
            .compareRun(actor.organizationId, path.id)
            .pipe(Effect.catchTag("EvalStoreError", Effect.die));

          return detail(found.value, comparisons);
        })
      )
      .handle(
        "promote",
        { permission: Permissions.Evals.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const baselines = yield* Baselines;

            const promoted = yield* baselines
              .promote({
                actorId: actor.id,
                cellInternalId: payload.cellInternalId,
                organizationId: actor.organizationId,
              })
              /* A cell that scored nothing cannot become a reference: every
                 later comparison would read it as a measured zero. That is a
                 conflict with the state of the cell, not a missing route. */
              .pipe(
                Effect.catchTag("VoidBaseline", (error) =>
                  Effect.fail(new Conflict({ message: error.reason }))
                )
              );

            return {
              cellKey: promoted.cellKey,
              passRate: promoted.distribution.passRate,
              promotedAt: DateTime.unsafeMake(promoted.promotedAt.getTime()),
            };
          }).pipe(
            /* A store failure is ours, not the caller's: nothing they could
               send would fix it, so it belongs in the 500 rather than in the
               contract. */
            Effect.catchTag("EvalStoreError", Effect.die)
          )
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
      /* Write, because a run spends real money on sandboxes and tokens. */
      .handle(
        "runPlayground",
        { permission: Permissions.Evals.Write },
        ({ path }) => runPlayground(path.id)
      ).done
);
