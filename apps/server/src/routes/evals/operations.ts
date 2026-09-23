import { CredentialResolver } from "@anpord/eval/credentials/resolver";
import { resolveVariantCredentials } from "@anpord/eval/credentials/variants";
import { profileOfRequest } from "@anpord/eval/domain/harness-profile";
import { asEntries } from "@anpord/eval/domain/journal-entries";
import { GridRun } from "@anpord/eval/grid/run";
import { setupOf } from "@anpord/eval/repositories/case-setup";
import { RunQuery } from "@anpord/eval/repositories/run-query";
import { Baselines } from "@anpord/eval/services/baselines";
import { CellReruns } from "@anpord/eval/services/cell-rerun";
import { ModelCatalogues } from "@anpord/eval/services/model-catalogue";
import { authorIdOf } from "@anpord/schema/domain/actor";
import { BadRequest, NotFound } from "@anpord/schema/domain/errors";
import type { RerunCellRequest } from "@anpord/schema/domain/eval-playground";
import { trialsRequested } from "@anpord/schema/domain/eval-quota";
import type { EvalTailMark } from "@anpord/schema/domain/eval-tail";
import {
  CASE_HISTORY_PAGE_SIZE,
  DEFAULT_SANDBOX,
  EVAL_SANDBOXES,
  type EvalHarness,
} from "@anpord/schema/domain/evals";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";
import { DateTime, Effect, Option } from "effect";
import { withEvalErrors } from "../../http/eval-errors";
import { EvalCredentials } from "../internal/evals/credentials";
import { harnessVersion } from "../internal/evals/harness-version";
import { meterRun } from "../internal/evals/meter-run";
import { toReadingView } from "../internal/evals/reading-to-api";
import { mintRunSubscription } from "../internal/evals/run-subscription";
import { detail, summarise } from "../internal/evals/run-to-api";
import { admitStart } from "../internal/evals/start-admission";

const HISTORY_LIMIT = 20;

interface PageParams {
  readonly cursorId?: string | undefined;
  readonly cursorStartedAt?: number | undefined;
  readonly limit?: number | undefined;
}

const cursorOf = (params: PageParams) =>
  params.cursorId === undefined || params.cursorStartedAt === undefined
    ? null
    : { id: params.cursorId, startedAtMillis: params.cursorStartedAt };

export const listEvalRuns = (params: PageParams) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const grid = yield* GridRun;

    const page = yield* grid.list({
      cursor: cursorOf(params),
      limit: params.limit,
      organizationId: actor.organizationId,
    });

    return {
      next: page.next,
      runs: page.runs.map(summarise),
      total: page.total,
    };
  });

export const listEvalCases = (
  params: PageParams & { readonly tag?: string | null | undefined }
) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const grid = yield* GridRun;

    return yield* grid.cases({
      cursor: cursorOf(params),
      limit: params.limit,
      organizationId: actor.organizationId,
      tag: params.tag ?? null,
    });
  });

export const startEvalRun = (payload: PublicStartEvalRequest) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;

    yield* admitStart(actor.organizationId, payload);

    const totalTrials = trialsRequested({
      cases: payload.cases.length,
      variants: payload.variants.length,
      trials: payload.trials,
    });

    const credentialResolver = yield* CredentialResolver;
    const grid = yield* GridRun;
    const credentials = yield* EvalCredentials;
    /* The sandbox is resolved here rather than defaulted in the schema: the
       cell key hashes the name, so it has to be a real one before a cell is
       identified. */
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
    const variants = yield* resolveVariantCredentials(
      credentialResolver,
      actor,
      requested,
      credentials.codexAuth
    ).pipe(
      Effect.mapError((error) => new BadRequest({ message: error.message }))
    );

    const id = yield* grid.start({
      executedBy: payload.executeLocally === true ? "client" : null,
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
      trigger: payload.trigger ?? { source: "api" },
      variants,
      trials: payload.trials,
    });

    yield* meterRun({
      organizationId: actor.organizationId,
      runId: id,
      trials: totalTrials,
    });

    return { id };
  });

export const getRunSubscription = (id: string) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const grid = yield* GridRun;
    const found = yield* grid.get(actor.organizationId, id);

    if (Option.isNone(found)) {
      return yield* Effect.fail(
        new NotFound({ message: `No eval run with id "${id}"` })
      );
    }

    return yield* mintRunSubscription(id);
  });

export const readRunTail = (id: string, after: readonly EvalTailMark[]) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const query = yield* RunQuery;
    const found = yield* query
      .readTail({ after, organizationId: actor.organizationId, runId: id })
      .pipe(Effect.orDie);

    if (Option.isNone(found)) {
      return yield* Effect.fail(
        new NotFound({ message: `No eval run with id "${id}"` })
      );
    }

    return {
      events: found.value.events.flatMap(({ event, ...address }) =>
        asEntries(event).map((entry) => ({ ...address, entry }))
      ),
      next: found.value.next,
      running: found.value.running,
      settled: found.value.settled,
    };
  }).pipe(Effect.withSpan("Evals.readRunTail", { attributes: { runId: id } }));

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
          const task = found.value.variants[cell.variantIndex];

          return cell.cellKey === null ||
            cell.definitionHash === null ||
            cell.internalId === null ||
            task === undefined ||
            Option.isNone(cell.distribution)
            ? []
            : [
                {
                  cellInternalId: cell.internalId,
                  cellKey: cell.cellKey,
                  definitionHash: cell.definitionHash,
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

    return entries.map(toReadingView);
  }).pipe(Effect.catchTag("EvalStoreError", Effect.die));

export const getCase = (id: string) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const query = yield* RunQuery;
    const found = yield* query.findCase({
      id,
      organizationId: actor.organizationId,
    });

    if (Option.isNone(found)) {
      return yield* Effect.fail(
        new NotFound({ message: `No eval case with id "${id}"` })
      );
    }

    const scope = { caseId: id, organizationId: actor.organizationId };
    const [variants, tasks] = yield* Effect.all(
      [query.findCaseVariants(scope), query.findCaseTasks(scope)],
      { concurrency: "unbounded" }
    );
    const [newest] = tasks;

    if (newest === undefined) {
      return yield* Effect.fail(
        new NotFound({ message: `Eval case "${id}" has never run` })
      );
    }

    return {
      ...found.value,
      id,
      setup: setupOf(newest),
      variants: variants.map(toReadingView),
      versions: found.value.versions.map((version) => ({
        ...version,
        createdAt: DateTime.unsafeMake(version.createdAt.getTime()),
      })),
    };
  }).pipe(Effect.catchTag("EvalStoreError", Effect.die));

export const getCaseHistory = (
  id: string,
  params: { readonly cellKey?: string; readonly page?: number }
) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const query = yield* RunQuery;
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const history = yield* query.findCaseHistory({
      caseId: id,
      cellKey: params.cellKey ?? null,
      limit: CASE_HISTORY_PAGE_SIZE,
      offset: (page - 1) * CASE_HISTORY_PAGE_SIZE,
      organizationId: actor.organizationId,
    });

    return {
      entries: history.entries.map(toReadingView),
      page,
      pageSize: CASE_HISTORY_PAGE_SIZE,
      total: history.total,
    };
  }).pipe(Effect.catchTag("EvalStoreError", Effect.die));

export const getTrialAddress = (trialId: string) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const query = yield* RunQuery;
    const found = yield* query.findTrial({
      organizationId: actor.organizationId,
      trialId,
    });

    if (Option.isNone(found)) {
      return yield* Effect.fail(
        new NotFound({ message: `No trial with id "${trialId}"` })
      );
    }

    return found.value;
  }).pipe(Effect.catchTag("EvalStoreError", Effect.die));

export const listRunAddresses = (input: {
  readonly cellKey?: string | undefined;
  readonly ordinal?: number | undefined;
  readonly runId: string;
}) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const query = yield* RunQuery;

    return yield* query.findRunAddresses({
      ...input,
      organizationId: actor.organizationId,
    });
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
      allowedProviders: EVAL_SANDBOXES,
      actor,
      cellKey: input.cellKey,
      legacyHarnessAuth: credentials.codexAuth,
      organizationId: actor.organizationId,
      runId: input.id,
      startedBy: authorIdOf(actor),
      trigger: input.trigger ?? { source: "api" },
      trials: input.trials,
    });
    return { id };
  }).pipe(withEvalErrors);

export const rerunEvalCase = (
  input: RerunCellRequest & { readonly id: string }
) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    const reruns = yield* CellReruns;
    const credentials = yield* EvalCredentials;
    const id = yield* reruns.acrossVariants({
      actor,
      caseId: input.id,
      legacyHarnessAuth: credentials.codexAuth,
      organizationId: actor.organizationId,
      startedBy: authorIdOf(actor),
      trigger: input.trigger ?? { source: "dashboard" },
      trials: input.trials,
    });

    return { id };
  }).pipe(withEvalErrors);

export const getEvalModels = (harness: EvalHarness, query?: string) =>
  Effect.flatMap(ModelCatalogues, (catalogues) =>
    catalogues.forHarness({ harness, query })
  );
