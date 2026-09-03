import { rollUp } from "@anpord/eval/domain/trial-cost";
import type { GridCell } from "@anpord/eval/grid/state";
import type { CellComparison } from "@anpord/eval/services/baselines";
import type { EvalCell, EvalComparison } from "@anpord/schema/domain/evals";
import { Option } from "effect";
import { asTrials } from "./trial-to-api";

const asComparison = (
  comparisons: readonly CellComparison[],
  cellKey: string | null
): EvalComparison | null => {
  if (cellKey === null) {
    return null;
  }

  const found = comparisons.find((entry) => entry.cellKey === cellKey);

  if (found === undefined || Option.isNone(found.comparison)) {
    return null;
  }

  return found.comparison.value;
};

export const asCell = (
  cell: GridCell,
  comparisons: readonly CellComparison[]
): EvalCell => ({
  caseName: cell.caseName,
  cellKey: cell.cellKey,
  comparison: asComparison(comparisons, cell.cellKey),
  /* Rolled up from the trials rather than stored, so a classification rule
     that is later corrected corrects every run behind it too. */
  costs: rollUp(asTrials(cell).map((trial) => trial.costs)),
  distribution: Option.getOrNull(cell.distribution),
  internalId: cell.internalId,
  setup: Option.getOrNull(cell.setup),
  status: cell.status,
  taskIndex: cell.taskIndex,
  trials: asTrials(cell),
});
