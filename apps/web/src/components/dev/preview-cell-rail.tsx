import { CellRail } from "@/components/evals/cell-rail";
import { CELL, TASK } from "./eval-fixtures";

export function PreviewCellRail() {
  return <CellRail cell={CELL} cellKey={CELL.cellKey ?? ""} task={TASK} />;
}
