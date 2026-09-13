import type { EvalRun } from "@anpord/schema/domain/evals";
import { casesOf } from "@anpord/schema/domain/variant-comparison";
import { cn } from "@anpord/ui/lib/utils";
import { CaseHeading, CellLine } from "@/components/evals/run-grid-cell-line";
import { leadersOf, TRACKS } from "@/components/evals/run-grid-columns";
import { Overall } from "@/components/evals/run-grid-overall";
import { VariantName } from "@/components/evals/variant-name";
import { RowTitle } from "@/components/layout/list-row";

export function RunGrid({ run }: { readonly run: EvalRun }) {
  const cases = casesOf(run);
  const single = run.tasks.length === 1;

  return (
    <div className={cn("grid", TRACKS)}>
      {cases.map((entry) => {
        const leaders = leadersOf(entry.results);

        return (
          <div
            className="col-span-full grid grid-cols-subgrid"
            key={entry.name}
          >
            {single ? null : <CaseHeading result={entry} />}

            {entry.results.map((result) => (
              <CellLine
                key={result.cell.cellKey ?? `${entry.name}-${result.taskIndex}`}
                leaders={leaders}
                result={result}
                runId={run.id}
                title={
                  single ? (
                    <RowTitle>{entry.name}</RowTitle>
                  ) : (
                    <VariantName task={result.task} />
                  )
                }
              />
            ))}
          </div>
        );
      })}

      {single || cases.length < 2 ? null : (
        <div className="col-span-full grid grid-cols-subgrid border-border-faint border-t">
          <Overall run={run} />
        </div>
      )}
    </div>
  );
}
