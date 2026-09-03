import type { CellTask } from "../repositories/run-tasks-query";

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
      `${subject.cell.harness} ${subject.cell.model} ${subject.cell.provider} ${subject.profile?.name ?? ""}`
  ),
});
