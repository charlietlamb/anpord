import { RunRail } from "@/components/evals/run-rail";
import { CELL, CELL_NO_BASELINE, RUNS, TASK } from "./eval-fixtures";

export function PreviewRunRail() {
  return (
    <RunRail
      run={{
        cases: [CELL.caseName, CELL_NO_BASELINE.caseName],
        cells: [CELL, CELL_NO_BASELINE],
        failure: null,
        finishedAt: RUNS[0]?.finishedAt ?? null,
        id: RUNS[0]?.id ?? "",
        startedAt: RUNS[0]?.startedAt,
        status: "finished",
        tasks: [TASK],
      }}
    />
  );
}
