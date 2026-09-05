import { CredentialResolver } from "@anpord/eval/credentials/resolver";
import { resolveTaskCredentials } from "@anpord/eval/credentials/tasks";
import { profileOfRequest } from "@anpord/eval/domain/harness-profile";
import { GridRun } from "@anpord/eval/grid/run";
import { BadRequest } from "@anpord/schema/domain/errors";
import { trialsRequested } from "@anpord/schema/domain/eval-quota";
import type { StartEvalRequest } from "@anpord/schema/domain/evals";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { Effect } from "effect";
import { EvalCredentials } from "./credentials";
import { harnessVersion } from "./harness-version";
import { meterRun } from "./meter-run";
import { admitStart } from "./start-admission";

/** The intake the web app uses. Bounded by the same admission the public API
 * is, because both reach one grid and one set of provider accounts. */
export const startEvalFromApp = (payload: StartEvalRequest) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;

    yield* admitStart(actor.organizationId, payload);

    const credentialResolver = yield* CredentialResolver;
    const grid = yield* GridRun;
    const credentials = yield* EvalCredentials;

    const requested = yield* Effect.forEach(payload.tasks, (task) =>
      harnessVersion(task.harness).pipe(
        Effect.map((harnessVersion) => ({
          ...task,
          harnessVersion,
          profile: profileOfRequest(task.profile),
        }))
      )
    );
    /* Reported rather than died on: a connection that is missing or revoked is
       something the person starting the run can fix, and the 500 orDie used to
       produce told them only that the server broke. */
    const tasks = yield* resolveTaskCredentials(
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
      startedBy: null,
      tasks,
      trials: payload.trials,
    });

    yield* meterRun({
      organizationId: actor.organizationId,
      runId: id,
      trials: trialsRequested({
        cases: payload.cases.length,
        tasks: payload.tasks.length,
        trials: payload.trials,
      }),
    });

    return { id };
  });
