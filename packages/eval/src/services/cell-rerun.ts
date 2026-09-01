import type { Actor } from "@anpord/schema/domain/actor";
import { Context, Effect, Layer, Option } from "effect";
import { CredentialResolver } from "../credentials/connections";
import type { CredentialError } from "../credentials/errors";
import { resolveTaskCredentials } from "../credentials/tasks";
import type { ProviderName } from "../domain/cell";
import { type EvalStoreError, NotRunnable } from "../domain/errors";
import { caseFrom, taskFrom } from "../grid/from-stored";
import { GridRun } from "../grid/run";
import { RunQuery } from "../repositories/run-query";

export interface RerunCell {
  readonly actor: Actor;
  readonly allowedProviders?: readonly ProviderName[];
  readonly cellKey: string;
  readonly legacyHarnessAuth: string;
  readonly organizationId: string;
  readonly runId: string;
  readonly startedBy: string | null;
  readonly trials: number;
}

export interface CellRerunsShape {
  readonly again: (
    input: RerunCell
  ) => Effect.Effect<string, CredentialError | EvalStoreError | NotRunnable>;
}

export class CellReruns extends Context.Tag("@anpord/eval/CellReruns")<
  CellReruns,
  CellRerunsShape
>() {}

export const make = Effect.gen(function* () {
  const credentials = yield* CredentialResolver;
  const grid = yield* GridRun;
  const query = yield* RunQuery;

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

    const subject = found.value;

    if (
      input.allowedProviders !== undefined &&
      !input.allowedProviders.includes(subject.cell.provider as ProviderName)
    ) {
      return yield* new NotRunnable({
        id: input.cellKey,
        problems: ["this sandbox cannot be rerun through this API"],
      });
    }

    if (subject.source === null) {
      return yield* new NotRunnable({
        id: input.cellKey,
        problems: ["this cell predates reproducible workspace snapshots"],
      });
    }

    if (
      subject.cell.harnessCredentialRevision !== null &&
      subject.cell.harnessCredentialConnectionId === null
    ) {
      return yield* new NotRunnable({
        id: input.cellKey,
        problems: ["the harness credential used by this cell was removed"],
      });
    }

    if (
      subject.cell.sandboxCredentialRevision !== null &&
      subject.cell.sandboxCredentialConnectionId === null
    ) {
      return yield* new NotRunnable({
        id: input.cellKey,
        problems: ["the sandbox credential used by this cell was removed"],
      });
    }

    const tasks = yield* resolveTaskCredentials(
      credentials,
      input.actor,
      [taskFrom(subject)],
      input.legacyHarnessAuth
    );

    return yield* grid.start({
      cases: [caseFrom(subject)],
      organizationId: input.organizationId,
      prompt: subject.prompt,
      startedBy: input.startedBy,
      tasks,
      trials: input.trials,
    });
  });

  return CellReruns.of({ again });
});

export const CellRerunsLive = Layer.effect(CellReruns, make);
