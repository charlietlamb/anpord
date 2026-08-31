import type { Actor } from "@anpord/schema/domain/actor";
import { Effect, Option } from "effect";
import type { CredentialResolverShape } from "../credentials/connections";
import type { CredentialError } from "../credentials/errors";
import { resolveTaskCredentials } from "../credentials/tasks";
import type { HarnessName, ProviderName } from "../domain/cell";
import { type EvalStoreError, NotRunnable } from "../domain/errors";
import type { CellTask, RunQueryShape } from "../repositories/run-query";
import type { GridCase } from "./cell";
import type { GridRunShape, ResumeGrid } from "./run";
import type { GridExecutionTask } from "./state";

const pairOf = (
  name: string | null | undefined,
  source: string | null | undefined
) => (name == null || source == null ? null : { name, source });

export const caseFrom = (subject: CellTask): GridCase => ({
  identity: subject.identity,
  name: subject.name,
  prepare: pairOf(subject.prepareName, subject.prepareSource),
  source: subject.source ?? { kind: "empty" },
  validator: pairOf(subject.validatorName, subject.validatorSource),
  variables: {},
  verify: subject.verifyCommand,
});

/** The task a stored cell ran, for a caller that will resolve its own
 * credentials. */
export const taskFrom = (subject: CellTask) => ({
  credentials: {
    harnessConnectionId:
      subject.cell.harnessCredentialConnectionId ?? undefined,
    sandboxConnectionId:
      subject.cell.sandboxCredentialConnectionId ?? undefined,
  },
  harness: subject.cell.harness as HarnessName,
  harnessVersion: subject.cell.harnessVersion,
  model: subject.cell.model,
  provider: subject.cell.provider as ProviderName,
});

const distinctBy = <A>(
  subjects: readonly A[],
  keyOf: (subject: A) => string
) => {
  const found = new Map<string, A>();

  for (const subject of subjects) {
    const key = keyOf(subject);

    if (!found.has(key)) {
      found.set(key, subject);
    }
  }

  return [...found.values()];
};

/**
 * The cases and tasks a stored run was built from.
 *
 * A run stores one row per cell, and a grid is the product of its cases and
 * its tasks, so handing the cells to both sides squares them: four cells of
 * two cases across two models rebuilt as sixteen, each pairing a case with a
 * model it had never been run against.
 */
const gridOf = (cells: readonly CellTask[]) => ({
  cases: distinctBy(cells, (subject) => subject.identity),
  tasks: distinctBy(
    cells,
    (subject) =>
      `${subject.cell.harness} ${subject.cell.harnessVersion} ${subject.cell.model} ${subject.cell.provider}`
  ),
});

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

const tasksFor = (
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

/**
 * The grid a stored run was, ready to be executed again.
 *
 * Shared by the two things that continue a run: the api, where a person asked,
 * and a worker, which was handed the id. They differ only in how credentials
 * are read, which is what CredentialSource carries.
 */
export const rebuildRun = (
  services: {
    readonly credentials: CredentialResolverShape;
    readonly grid: GridRunShape;
    readonly query: RunQueryShape;
  },
  input: {
    readonly organizationId: string;
    readonly runId: string;
    readonly source: CredentialSource;
  }
): Effect.Effect<ResumeGrid, CredentialError | EvalStoreError | NotRunnable> =>
  Effect.gen(function* () {
    const live = yield* services.grid.get(input.organizationId, input.runId);

    /* A run already executing has a fiber per cell. Continuing it would start
       a second set against the same rows, so both write trials to one cell and
       whichever finishes last decides what the run says. */
    if (Option.isSome(live) && live.value.status === "running") {
      return yield* new NotRunnable({
        id: input.runId,
        problems: ["that run is already running"],
      });
    }

    const cells = yield* services.query.findRunTasks({
      organizationId: input.organizationId,
      runId: input.runId,
    });

    const [first] = cells;

    if (first === undefined) {
      return yield* new NotRunnable({
        id: input.runId,
        problems: ["that run has no cells to continue"],
      });
    }

    const rebuilt = gridOf(cells);

    const tasks = yield* tasksFor(
      services.credentials,
      input.organizationId,
      input.source,
      rebuilt.tasks
    );

    return {
      created: { id: input.runId, internalId: first.cell.runInternalId },
      input: {
        cases: rebuilt.cases.map(caseFrom),
        organizationId: input.organizationId,
        prompt: first.prompt,
        startedBy: null,
        tasks,
        trials: 1,
      },
      /* Indexed by case, because that is how the grid reads it: one entry per
         case, not per cell. */
      registered: rebuilt.cases.map((subject) => ({
        id: subject.identity,
        internalId: subject.cell.taskInternalId,
      })),
    } satisfies ResumeGrid;
  }).pipe(
    Effect.withSpan("Grid.rebuildRun", { attributes: { runId: input.runId } }),
    Effect.annotateLogs({
      organizationId: input.organizationId,
      runId: input.runId,
    })
  );
