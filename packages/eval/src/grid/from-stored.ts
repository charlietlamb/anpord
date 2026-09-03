import type { HarnessName, ProviderName } from "../domain/cell";
import type { CellTask } from "../repositories/run-query";
import type { GridCase } from "./cell";

const pairOf = (
  name: string | null | undefined,
  source: string | null | undefined
) => (name == null || source == null ? null : { name, source });

export const caseFrom = (subject: CellTask): GridCase => ({
  /* Read back, because a worker rebuilds every dispatched run from here: a
     declaration that survives only in the request is one no run beyond the
     first ever sees. */
  cache:
    subject.cacheKey === null || subject.cachePath === null
      ? undefined
      : { key: subject.cacheKey, path: subject.cachePath },
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
