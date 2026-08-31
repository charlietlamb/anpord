import type { RequestedTask } from "../credentials/tasks";
import type { HarnessName, ProviderName } from "../domain/cell";
import type { CellTask } from "../repositories/run-query";
import type { GridCase } from "./cell";

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

export const taskFrom = (subject: CellTask): RequestedTask => ({
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
export const gridOf = (cells: readonly CellTask[]) => ({
  cases: distinctBy(cells, (subject) => subject.identity),
  tasks: distinctBy(
    cells,
    (subject) =>
      `${subject.cell.harness} ${subject.cell.harnessVersion} ${subject.cell.model} ${subject.cell.provider}`
  ),
});
