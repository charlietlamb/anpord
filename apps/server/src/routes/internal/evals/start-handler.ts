import { CredentialResolver } from "@anpord/eval/credentials/resolver";
import { resolveVariantCredentials } from "@anpord/eval/credentials/variants";
import { profileOfRequest } from "@anpord/eval/domain/harness-profile";
import { GridRun } from "@anpord/eval/grid/run";
import { authorIdOf } from "@anpord/schema/domain/actor";
import { BadRequest } from "@anpord/schema/domain/errors";
import { trialsRequested } from "@anpord/schema/domain/eval-quota";
import {
  DEFAULT_SANDBOX,
  type StartEvalRequest,
} from "@anpord/schema/domain/evals";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { Effect } from "effect";
import { EvalCredentials } from "./credentials";
import { harnessVersion } from "./harness-version";
import { meterRun } from "./meter-run";
import { admitStart } from "./start-admission";

/* Bounded by the same admission as the public API: both reach one grid and one set of provider accounts. */
export const startEvalFromApp = (payload: StartEvalRequest) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;

    yield* admitStart(actor.organizationId, payload);

    const credentialResolver = yield* CredentialResolver;
    const grid = yield* GridRun;
    const credentials = yield* EvalCredentials;

    const requested = yield* Effect.forEach(payload.variants, (task) =>
      harnessVersion(task.harness).pipe(
        Effect.map((harnessVersion) => ({
          ...task,
          harnessVersion,
          profile: profileOfRequest(task.profile),
          provider: task.sandbox ?? DEFAULT_SANDBOX,
        }))
      )
    );
    /* Reported rather than died on: a missing or revoked connection is something the caller can fix. */
    const variants = yield* resolveVariantCredentials(
      credentialResolver,
      actor,
      requested,
      credentials.codexAuth
    ).pipe(
      Effect.mapError((error) => new BadRequest({ message: error.message }))
    );

    const id = yield* grid.start({
      cases: payload.cases.map((subject) => ({
        cache: subject.cache,
        id: subject.id,
        name: subject.name,
        prepare: subject.prepare,
        source: subject.source,
        validator: subject.validator,
        variables: subject.variables,
        verify: subject.verify,
      })),
      name: payload.name ?? null,
      organizationId: actor.organizationId,
      prompt: payload.prompt,
      startedBy: authorIdOf(actor),
      trigger: { source: "dashboard" },
      variants,
      trials: payload.trials,
    });

    yield* meterRun({
      organizationId: actor.organizationId,
      runId: id,
      trials: trialsRequested({
        cases: payload.cases.length,
        variants: payload.variants.length,
        trials: payload.trials,
      }),
    });

    return { id };
  });
