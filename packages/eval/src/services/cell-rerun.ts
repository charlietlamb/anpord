import type { Actor } from "@anpord/schema/domain/actor";
import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import { Context, Effect, Layer, Option } from "effect";
import type { CredentialError } from "../credentials/errors";
import { CredentialResolver } from "../credentials/resolver";
import { resolveVariantCredentials } from "../credentials/variants";
import type { ProviderName } from "../domain/cell";
import { type EvalStoreError, NotRunnable } from "../domain/errors";
import { caseFrom, taskFrom } from "../grid/from-stored";
import { GridRun } from "../grid/run";
import { RunQuery } from "../repositories/run-query";
import type { CellTask } from "../repositories/run-tasks-query";

interface RerunRequest {
  readonly actor: Actor;
  readonly allowedProviders?: readonly ProviderName[];
  readonly legacyHarnessAuth: string;
  readonly organizationId: string;
  readonly startedBy: string | null;
  readonly trials: number;
  readonly trigger?: EvalTrigger;
}

export interface RerunCell extends RerunRequest {
  readonly cellKey: string;
  readonly runId: string;
}

export interface RerunCase extends RerunRequest {
  readonly caseId: string;
}

type RerunError = CredentialError | EvalStoreError | NotRunnable;

export interface CellRerunsShape {
  readonly acrossVariants: (
    input: RerunCase
  ) => Effect.Effect<string, RerunError>;
  readonly again: (input: RerunCell) => Effect.Effect<string, RerunError>;
}

export class CellReruns extends Context.Tag("@anpord/eval/CellReruns")<
  CellReruns,
  CellRerunsShape
>() {}

const problemOf = (
  subject: CellTask,
  allowedProviders: readonly ProviderName[] | undefined
) => {
  if (
    allowedProviders !== undefined &&
    !allowedProviders.some((allowed) => allowed === subject.cell.provider)
  ) {
    return "this sandbox cannot be rerun through this API";
  }

  if (subject.source === null) {
    return "this cell predates reproducible workspace snapshots";
  }

  if (
    subject.cell.harnessCredentialRevision !== null &&
    subject.cell.harnessCredentialConnectionId === null
  ) {
    return "the harness credential used by this cell was removed";
  }

  if (
    subject.cell.sandboxCredentialRevision !== null &&
    subject.cell.sandboxCredentialConnectionId === null
  ) {
    return "the sandbox credential used by this cell was removed";
  }

  return Option.isNone(taskFrom(subject))
    ? "this cell names a harness or provider this build does not have"
    : null;
};

const variantOf = ({ cell }: CellTask) =>
  [cell.harness, cell.model, cell.provider, cell.profileInternalId].join("\n");

const newestPerVariant = (subjects: readonly CellTask[]) =>
  subjects.filter(
    (subject, index) =>
      subjects.findIndex((other) => variantOf(other) === variantOf(subject)) ===
      index
  );

export const make = Effect.gen(function* () {
  const credentials = yield* CredentialResolver;
  const grid = yield* GridRun;
  const query = yield* RunQuery;

  const start = (
    id: string,
    subjects: readonly CellTask[],
    input: RerunRequest
  ) =>
    Effect.gen(function* () {
      const [newest] = subjects;

      if (newest === undefined) {
        return yield* new NotRunnable({ id, problems: ["nothing has run"] });
      }

      const problems = subjects.flatMap((subject) => {
        const problem = problemOf(subject, input.allowedProviders);
        return problem === null ? [] : [problem];
      });

      if (problems.length > 0) {
        return yield* new NotRunnable({ id, problems });
      }

      const variants = yield* resolveVariantCredentials(
        credentials,
        input.actor,
        subjects.flatMap((subject) => Option.toArray(taskFrom(subject))),
        input.legacyHarnessAuth
      );

      return yield* grid.start({
        cases: [caseFrom(newest)],
        name: newest.runName,
        organizationId: input.organizationId,
        prompt: newest.prompt,
        startedBy: input.startedBy,
        trigger: input.trigger,
        variants,
        trials: input.trials,
      });
    });

  const again = Effect.fn("CellReruns.again")(function* (input: RerunCell) {
    const found = yield* query.findCellTask({
      cellKey: input.cellKey,
      organizationId: input.organizationId,
      runId: input.runId,
    });

    if (Option.isNone(found)) {
      return yield* new NotRunnable({
        id: input.cellKey,
        problems: ["this cell is not part of that run"],
      });
    }

    return yield* start(input.cellKey, [found.value], input);
  });

  const acrossVariants = Effect.fn("CellReruns.acrossVariants")(function* (
    input: RerunCase
  ) {
    const subjects = yield* query.findCaseTasks({
      caseId: input.caseId,
      organizationId: input.organizationId,
    });

    return yield* start(input.caseId, newestPerVariant(subjects), input);
  });

  return CellReruns.of({ acrossVariants, again });
});

export const CellRerunsLive = Layer.effect(CellReruns, make);
