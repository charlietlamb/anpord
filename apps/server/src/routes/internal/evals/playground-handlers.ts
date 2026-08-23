import {
  readinessOf,
  ungatedCasesIn,
} from "@anpord/eval/domain/playground-config";
import type { Workbench } from "@anpord/eval/services/workbench";
import { Workbenches } from "@anpord/eval/services/workbench";
import { Conflict, NotFound } from "@anpord/schema/domain/errors";
import type { PlaygroundView } from "@anpord/schema/domain/evals";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { DateTime, Effect, Option } from "effect";
import { EvalCredentials } from "./credentials";

const view = (workbench: Workbench): PlaygroundView => ({
  config: workbench.config,
  id: workbench.id,
  lastRunId: workbench.lastRunId,
  name: workbench.name,
  problems: readinessOf(workbench.config),
  ungated: ungatedCasesIn(workbench.config),
  updatedAt: DateTime.unsafeMake(workbench.updatedAt.getTime()),
});

const missing = (id: string) =>
  new NotFound({ message: `No playground with id "${id}"` });

export const listPlaygrounds = () =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const workbenches = yield* Workbenches;

    const found = yield* workbenches.list(actor.organizationId);

    return found.map(view);
  }).pipe(Effect.catchTag("EvalStoreError", Effect.die));

export const createPlayground = (payload: { readonly name: string }) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const workbenches = yield* Workbenches;

    return view(
      yield* workbenches.create({
        actorId: actor.id,
        name: payload.name,
        organizationId: actor.organizationId,
      })
    );
  }).pipe(Effect.catchTag("EvalStoreError", Effect.die));

export const getPlayground = (id: string) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const workbenches = yield* Workbenches;

    const found = yield* workbenches.find(actor.organizationId, id);

    if (Option.isNone(found)) {
      return yield* Effect.fail(missing(id));
    }

    return view(found.value);
  }).pipe(Effect.catchTag("EvalStoreError", Effect.die));

export const savePlayground = (
  id: string,
  payload: {
    readonly config: PlaygroundView["config"];
    readonly name: string;
  }
) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const workbenches = yield* Workbenches;

    /* Checked before writing rather than trusting the path: an update whose
       filter matches nothing returns no row, and reporting that as a
       successful save would lose somebody's work silently. */
    const existing = yield* workbenches.find(actor.organizationId, id);

    if (Option.isNone(existing)) {
      return yield* Effect.fail(missing(id));
    }

    return view(
      yield* workbenches.save({
        config: payload.config,
        id,
        name: payload.name,
        organizationId: actor.organizationId,
      })
    );
  }).pipe(Effect.catchTag("EvalStoreError", Effect.die));

export const runPlayground = (id: string) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const credentials = yield* EvalCredentials;
    const workbenches = yield* Workbenches;

    return {
      id: yield* workbenches.run({
        actor,
        id,
        organizationId: actor.organizationId,
        startedBy: actor.id,
        legacyHarnessAuth: credentials.codexAuth,
      }),
    };
  }).pipe(
    /* A playground that cannot run yet is a conflict with its own state, and
       every reason travels at once: fixing one and being told the next is
       worse than being told all of them now. */
    Effect.catchTag("NotRunnable", (error) =>
      Effect.fail(new Conflict({ message: error.problems.join("; ") }))
    ),
    Effect.catchTag("EvalStoreError", Effect.die),
    Effect.orDie
  );
