import type { Actor } from "@anpord/schema/domain/actor";
import { Effect } from "effect";
import type { CredentialResolverShape } from "../credentials/connections";
import { resolveTaskCredentials } from "../credentials/tasks";
import type { HarnessName, ProviderName } from "../domain/cell";
import { NotRunnable } from "../domain/errors";
import type { CellTask } from "../repositories/run-query";
import { taskFrom } from "./from-stored";
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
      harness: subject.cell.harness as HarnessName,
      harnessVersion: subject.cell.harnessVersion,
      model: subject.cell.model,
      provider: subject.cell.provider as ProviderName,
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
        cells.map(taskFrom),
        source.legacyHarnessAuth
      );
