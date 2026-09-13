import type { EvalCell } from "@anpord/schema/domain/evals";
import type {
  CaseResult,
  CellResult,
  Metric as MetricKey,
} from "@anpord/schema/domain/variant-comparison";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CellVerdict } from "@/components/evals/cell-verdict";
import { CellVerdictNote } from "@/components/evals/cell-verdict-note";
import { RunStatusIcon } from "@/components/evals/eval-status-badge";
import { LINE, Metrics } from "@/components/evals/run-grid-columns";
import { RowTitle } from "@/components/layout/list-row";

function Verdict({ cell }: { readonly cell: EvalCell }) {
  return (
    <span className="flex min-w-5 justify-end">
      {cell.comparison === null ? null : (
        <CellVerdict comparison={cell.comparison} />
      )}
    </span>
  );
}

export function CaseHeading({ result }: { readonly result: CaseResult }) {
  const solved = result.results.filter(
    (entry) => entry.scored > 0 && entry.passed === entry.scored
  ).length;

  return (
    <div className="col-span-full flex h-9 items-center gap-2.5 pt-2">
      <RowTitle>{result.name}</RowTitle>
      <span className="text-muted-foreground/70 text-xs tabular-nums">
        {solved}/{result.results.length}
      </span>
    </div>
  );
}

export function CellLine({
  leaders,
  result,
  runId,
  title,
}: {
  readonly leaders: ReadonlyMap<MetricKey, ReadonlySet<number>>;
  readonly result: CellResult;
  readonly runId: string;
  readonly title: ReactNode;
}) {
  const { cell } = result;
  const line = cn(
    LINE,
    BLEED_ROW,
    "h-10 rounded-md text-label transition-colors",
    cell.cellKey === null ? null : "hover:bg-muted/50 hover:text-foreground"
  );

  const body = (
    <>
      <RunStatusIcon status={cell.status} />
      <span className="min-w-0 truncate">{title}</span>
      <Metrics leaders={leaders} result={result} />
      <Verdict cell={cell} />
    </>
  );

  const note = <CellVerdictNote cell={cell} />;

  if (cell.cellKey === null) {
    return (
      <>
        <div className={line}>{body}</div>
        <div className="col-span-full">{note}</div>
      </>
    );
  }

  return (
    <>
      <Link
        className={line}
        params={{ cellKey: cell.cellKey, runId }}
        to="/evals/$runId/cells/$cellKey"
      >
        {body}
      </Link>
      <div className="col-span-full">{note}</div>
    </>
  );
}
