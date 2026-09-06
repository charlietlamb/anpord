import { CellRail } from "@/components/evals/cell-rail";
import { CELL, RUN, TASK } from "./eval-fixtures";

export function PreviewCellRail() {
  return (
    <CellRail
      cell={CELL}
      cellKey={CELL.cellKey ?? ""}
      runId={RUN.id}
      task={TASK}
    />
  );
}
