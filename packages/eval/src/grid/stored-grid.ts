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

/* Deduplicated on both sides: a grid is the product of its cases and tasks, so
   handing the cells to both squares them. */
export const gridOf = (cells: readonly CellTask[]) => ({
  cases: distinctBy(cells, (subject) => subject.identity),
  tasks: distinctBy(
    cells,
    (subject) =>
      `${subject.cell.harness} ${subject.cell.model} ${subject.cell.provider} ${subject.profile?.name ?? ""}`
  ),
});
