import type { Actor } from "@anpord/schema/domain/actor";
import type { CredentialBindings } from "@anpord/schema/domain/credentials";
import { Context, Effect, Layer, Option } from "effect";
import { CredentialResolver } from "../credentials/connections";
import type { CredentialError } from "../credentials/errors";
import {
  type RequestedTask,
  resolveTaskCredentials,
} from "../credentials/tasks";
import type { HarnessName, ProviderName } from "../domain/cell";
import { type EvalStoreError, NotRunnable } from "../domain/errors";
import { GridRun } from "../grid/run";
import { type CellTask, RunQuery } from "../repositories/run-query";

const bindingsOf = (cell: CellTask["cell"]): CredentialBindings => ({
  harnessConnectionId: cell.harnessCredentialConnectionId ?? undefined,
  sandboxConnectionId: cell.sandboxCredentialConnectionId ?? undefined,
});

const taskOf = (subject: CellTask): RequestedTask => ({
  credentials: bindingsOf(subject.cell),
  harness: subject.cell.harness as HarnessName,
  harnessVersion: subject.cell.harnessVersion,
  model: subject.cell.model,
  provider: subject.cell.provider as ProviderName,
});

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
      [taskOf(subject)],
      input.legacyHarnessAuth
    );

    return yield* grid.start({
      cases: [
        {
          goal: subject.prompt,
          identity: subject.identity,
          name: subject.name,
          setup: subject.setupCommand,
          source: subject.source,
          validator:
            subject.validatorName == null || subject.validatorSource == null
              ? null
              : {
                  name: subject.validatorName,
                  source: subject.validatorSource,
                },
          verify: subject.verifyCommand,
        },
      ],
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
