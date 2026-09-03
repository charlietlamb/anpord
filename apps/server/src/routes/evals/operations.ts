import { AutumnService } from "@anpord/billing/autumn";
import { CredentialResolver } from "@anpord/eval/credentials/connections";
import { resolveTaskCredentials } from "@anpord/eval/credentials/tasks";
import { GridRun } from "@anpord/eval/grid/run";
import { Baselines } from "@anpord/eval/services/baselines";
import { CellReruns } from "@anpord/eval/services/cell-rerun";
import { ModelCatalogues } from "@anpord/eval/services/model-catalogue";
import { authorIdOf } from "@anpord/schema/domain/actor";
import { BadRequest, Conflict, NotFound } from "@anpord/schema/domain/errors";
import {
  EVAL_PROVIDERS,
  type EvalHarness,
  type RerunCellRequest,
} from "@anpord/schema/domain/evals";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";
import { Effect, Option } from "effect";
import { EvalCredentials } from "../internal/evals/credentials";
import { harnessVersion } from "../internal/evals/harness-version";
import { asReading, detail, summarise } from "../internal/evals/to-api";

const HISTORY_LIMIT = 20;

export const listEvalRuns = (params: {
  readonly cursorId?: string | undefined;
  readonly cursorStartedAt?: number | undefined;
  readonly limit?: number | undefined;
}) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const grid = yield* GridRun;

    const cursor =
      params.cursorId === undefined || params.cursorStartedAt === undefined
        ? null
        : { id: params.cursorId, startedAtMillis: params.cursorStartedAt };

    const page = yield* grid.list({
      cursor,
      limit: params.limit,
      organizationId: actor.organizationId,
    });

    return {
      next: page.next,
      runs: page.runs.map(summarise),
      total: page.total,
    };
  });

const MAX_PUBLIC_TRIALS = 100;

export const startEvalRun = (payload: PublicStartEvalRequest) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const credentialResolver = yield* CredentialResolver;
    const taskKeys = payload.tasks.map(({ harness, model, provider }) =>
      [harness, model, provider].join("\0")
    );

    if (new Set(taskKeys).size !== taskKeys.length) {
      return yield* Effect.fail(
        new BadRequest({ message: "Each eval task must be unique" })
      );
    }

    const totalTrials =
      payload.cases.length * payload.tasks.length * payload.trials;

    if (totalTrials > MAX_PUBLIC_TRIALS) {
      return yield* Effect.fail(
        new BadRequest({
          message: `A run may contain at most ${MAX_PUBLIC_TRIALS} trials`,
        })
      );
    }

    const grid = yield* GridRun;
    const autumn = yield* AutumnService;
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
    ).pipe(
      Effect.mapError((error) => new BadRequest({ message: error.message }))
    );

    const id = yield* grid.start({
      cases: payload.cases.map((evalCase) => ({
        ...evalCase,
        prepare: evalCase.prepare ?? null,
        source: evalCase.source ?? { kind: "empty" as const },
        validator: evalCase.validator ?? null,
        variables: evalCase.variables ?? {},
      })),
      name: payload.name ?? null,
      organizationId: actor.organizationId,
      prompt: payload.prompt,
      startedBy: authorIdOf(actor),
      tasks,
      trials: payload.trials,
    });

    /* Counted after the run is accepted, so a refused request is not billed,
       and forked so a slow meter does not hold up the response. */
    yield* Effect.forkDaemon(
      autumn
        .call("Autumn.track", (client) =>
          client.track({
            customerId: actor.organizationId,
            featureId: "evals",
            value: totalTrials,
          })
        )
        .pipe(
          Effect.catchAll((error) =>
            Effect.logError("could not record eval usage", error).pipe(
              Effect.annotateLogs({ orgId: actor.organizationId, runId: id })
            )
          )
        )
    );

    return { id };
  });

export const getEvalRun = (id: string) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const baselines = yield* Baselines;
    const grid = yield* GridRun;
    const found = yield* grid.get(actor.organizationId, id);

    if (Option.isNone(found)) {
      return yield* Effect.fail(
        new NotFound({ message: `No eval run with id "${id}"` })
      );
    }

    const comparisons = yield* baselines
      .compareCells(
        actor.organizationId,
        found.value.cells.flatMap((cell) => {
          const task = found.value.tasks[cell.taskIndex];

          return cell.cellKey === null ||
            cell.internalId === null ||
            task === undefined ||
            Option.isNone(cell.distribution)
            ? []
            : [
                {
                  cellInternalId: cell.internalId,
                  cellKey: cell.cellKey,
                  distribution: cell.distribution.value,
                  harnessVersion: task.harnessVersion,
                },
              ];
        })
      )
      .pipe(Effect.catchTag("EvalStoreError", Effect.die));

    return detail(found.value, comparisons);
  });

export const getCellHistory = (cellKey: string) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const baselines = yield* Baselines;
    const entries = yield* baselines.history({
      cellKey,
      limit: HISTORY_LIMIT,
      organizationId: actor.organizationId,
    });

    return entries.map(asReading);
  }).pipe(Effect.catchTag("EvalStoreError", Effect.die));

export const rerunEvalCell = (
  input: RerunCellRequest & {
    readonly cellKey: string;
    readonly id: string;
  }
) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const reruns = yield* CellReruns;
    const credentials = yield* EvalCredentials;
    const id = yield* reruns.again({
      allowedProviders: EVAL_PROVIDERS,
      actor,
      cellKey: input.cellKey,
      legacyHarnessAuth: credentials.codexAuth,
      organizationId: actor.organizationId,
      runId: input.id,
      startedBy: authorIdOf(actor),
      trials: input.trials,
    });
    return { id };
  }).pipe(
    Effect.mapError((problem) =>
      problem._tag === "CredentialError"
        ? new Conflict({ message: problem.message })
        : problem
    ),
    Effect.catchTag("EvalStoreError", Effect.die),
    Effect.catchTag("NotRunnable", (problem) =>
      Effect.fail(new Conflict({ message: problem.problems.join(", ") }))
    )
  );

export const getEvalModels = (harness: EvalHarness, query?: string) =>
  Effect.flatMap(ModelCatalogues, (catalogues) =>
    catalogues.forHarness({ harness, query })
  );
