import { CredentialResolver } from "@anpord/eval/credentials/resolver";
import { resolveTaskCredentials } from "@anpord/eval/credentials/tasks";
import { profileOfRequest } from "@anpord/eval/domain/harness-profile";
import { GridRun } from "@anpord/eval/grid/run";
import { Baselines } from "@anpord/eval/services/baselines";
import { CellReruns } from "@anpord/eval/services/cell-rerun";
import { ModelCatalogues } from "@anpord/eval/services/model-catalogue";
import { authorIdOf } from "@anpord/schema/domain/actor";
import { BadRequest, Conflict, NotFound } from "@anpord/schema/domain/errors";
import { trialsRequested } from "@anpord/schema/domain/eval-quota";
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
import { meterRun } from "../internal/evals/meter-run";
import { asReading } from "../internal/evals/reading-to-api";
import { detail, summarise } from "../internal/evals/run-to-api";
import { admitStart } from "../internal/evals/start-admission";

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

export const startEvalRun = (payload: PublicStartEvalRequest) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;

    yield* admitStart(actor.organizationId, payload);

    const totalTrials = trialsRequested({
      cases: payload.cases.length,
      tasks: payload.tasks.length,
      trials: payload.trials,
    });

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

    yield* meterRun({
      organizationId: actor.organizationId,
      runId: id,
      trials: totalTrials,
    });

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
                  profileVersion: task.profile?.version ?? null,
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
