import type { Actor } from "@anpord/schema/domain/actor";
import { Effect, Option } from "effect";
import type { CredentialResolverShape } from "../credentials/resolver";
import { resolveTaskCredentials } from "../credentials/tasks";
import { NotRunnable } from "../domain/errors";
import { namesOf } from "../domain/stored-cell";
import type { CellTask } from "../repositories/run-tasks-query";
import { profileFrom, taskFrom } from "./from-stored";
import type { GridExecutionTask } from "./state";

/**
 * How the credentials a stored run used are read back.
 *
 * Two callers, two answers. A person resuming through the api has a session,
 * so their credentials are resolved against them and a personal one stays
 * theirs. A worker has none: it was handed a run id, and the question of
 * whether that run may use these credentials was answered when a person
 * started it. Asking again would mean inventing the user who is not there.
 */
export type CredentialSource =
  | { readonly actor: Actor; readonly legacyHarnessAuth: string }
  | { readonly bound: true };

const boundTask = (
  credentials: CredentialResolverShape,
  organizationId: string
) =>
  Effect.fn("Grid.boundTask")(function* (subject: CellTask) {
    const harnessId = subject.cell.harnessCredentialConnectionId;

    if (harnessId === null) {
      return yield* new NotRunnable({
        id: subject.identity,
        problems: ["that cell recorded no harness credential to continue with"],
      });
    }

    const names = namesOf(subject.cell);

    if (Option.isNone(names)) {
      return yield* new NotRunnable({
        id: subject.identity,
        problems: ["that cell names a harness or provider this build has not"],
      });
    }

    const harness = yield* credentials.resolveBound({
      connectionId: harnessId,
      organizationId,
    });

    const sandboxId = subject.cell.sandboxCredentialConnectionId;

    const sandbox =
      sandboxId === null
        ? undefined
        : yield* credentials.resolveBound({
            connectionId: sandboxId,
            organizationId,
          });

    return {
      bindings: {
        harnessConnectionId: harnessId,
        sandboxConnectionId: sandboxId ?? undefined,
      },
      credentials: { harness, ...(sandbox === undefined ? {} : { sandbox }) },
      harness: names.value.harness,
      harnessVersion: subject.cell.harnessVersion,
      model: subject.cell.model,
      profile: profileFrom(subject),
      provider: names.value.provider,
    } satisfies GridExecutionTask;
  });

export const tasksWithCredentials = (
  credentials: CredentialResolverShape,
  organizationId: string,
  source: CredentialSource,
  cells: readonly CellTask[]
) =>
  "bound" in source
    ? Effect.forEach(cells, boundTask(credentials, organizationId))
    : resolveTaskCredentials(
        credentials,
        source.actor,
        /* A cell whose harness this build no longer has is dropped rather
           than resolved: the rest of the run can still be resumed. */
        cells.flatMap((cell) => Option.toArray(taskFrom(cell))),
        source.legacyHarnessAuth
      );
