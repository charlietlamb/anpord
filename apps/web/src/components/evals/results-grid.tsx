import type { EvalCell, EvalRun } from "@anpord/schema/domain/evals";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

const spreadOf = (cell: EvalCell) => {
  const found = cell.distribution;

  if (found === null) {
    return null;
  }

  return found.commandMin === found.commandMax
    ? `${found.commandMin}`
    : `${found.commandMin} to ${found.commandMax}`;
};

const Square = ({
  cell,
  onOpen,
  selected,
}: {
  readonly cell: EvalCell | undefined;
  readonly onOpen: () => void;
  readonly selected: boolean;
}) => {
  if (cell === undefined) {
    return <td className="px-4 py-3" />;
  }

  const found = cell.distribution;
  const settled = cell.trials.filter((trial) => trial.status !== "running");

  return (
    <td className="p-0 align-top">
      <button
        className={cn(
          "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted",
          selected && "bg-muted/60"
        )}
        onClick={onOpen}
        type="button"
      >
        {found === null ? (
          <>
            <Skeleton className="h-4 w-12" />
            <span className="text-muted-foreground text-xs tabular-nums">
              {settled.length} of {cell.trials.length}
            </span>
          </>
        ) : (
          <>
            <span
              className={cn(
                "font-medium text-sm tabular-nums",
                found.passed === found.scored && found.scored > 0
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {found.passed}/{found.scored}
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {spreadOf(cell)} commands
              {found.voided > 0 ? ` · ${found.voided} no evidence` : ""}
            </span>
          </>
        )}
      </button>
    </td>
  );
};

/**
 * One row per case, one column per task.
 *
 * This is the shape the comparison lives in: a second task column is how a
 * customer sees one harness or model against another on the same cases, which
 * is the question they are actually asking and the reason to keep using this.
 */
export function ResultsGrid({
  onOpen,
  run,
  selected,
}: {
  readonly onOpen: (cell: EvalCell) => void;
  readonly run: EvalRun;
  readonly selected: EvalCell | undefined;
}) {
  const find = (taskIndex: number, caseName: string) =>
    run.cells.find(
      (cell) => cell.taskIndex === taskIndex && cell.caseName === caseName
    );

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">
              Case
            </th>
            {run.tasks.map((task, index) => (
              <th
                className="px-4 py-2 text-left font-medium text-muted-foreground text-xs"
                key={`${task.harness}-${task.model}-${task.provider}`}
              >
                {task.model}
                <span className="ml-1 font-normal">on {task.provider}</span>
                {index === 0 ? null : (
                  <span className="ml-1 font-normal">(comparison)</span>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {run.cases.map((caseName) => (
            <tr className="border-b last:border-b-0" key={caseName}>
              <td className="px-4 py-3 align-top font-medium">{caseName}</td>
              {run.tasks.map((task, taskIndex) => {
                const cell = find(taskIndex, caseName);

                return (
                  <Square
                    cell={cell}
                    key={`${task.model}-${task.provider}-${caseName}`}
                    onOpen={() => {
                      if (cell !== undefined) {
                        onOpen(cell);
                      }
                    }}
                    selected={
                      selected?.caseName === caseName &&
                      selected?.taskIndex === taskIndex
                    }
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
