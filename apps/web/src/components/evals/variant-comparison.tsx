import type { EvalCell, EvalTask } from "@anpord/schema/domain/evals";
import {
  leadersOn,
  type Metric,
  type VariantResult,
  variantsOf,
} from "@anpord/schema/domain/variant-comparison";
import { cn } from "@anpord/ui/lib/utils";
import { seconds } from "@/lib/evals/duration";
import {
  harnessPresentation,
  modelPresentation,
  providerPresentation,
} from "@/lib/evals/variant-presentation";

const COLUMNS: readonly {
  readonly hint: string;
  readonly label: string;
  readonly metric: Metric;
  readonly read: (variant: VariantResult) => string;
}[] = [
  {
    hint: "Trials that passed, across every case",
    label: "Pass",
    metric: "passRate",
    read: (variant) =>
      variant.passRate === null
        ? "—"
        : `${Math.round(variant.passRate * 100)}%`,
  },
  {
    hint: "Median time the model spent thinking",
    label: "Model",
    metric: "modelMs",
    read: (variant) =>
      variant.modelMs === null ? "—" : seconds(variant.modelMs),
  },
  {
    hint: "Median commands the agent ran",
    label: "Commands",
    metric: "commands",
    read: (variant) =>
      variant.commands === null ? "—" : String(Math.round(variant.commands)),
  },
  {
    hint: "Median tokens the harness reported",
    label: "Tokens",
    metric: "tokens",
    read: (variant) =>
      variant.tokens === null
        ? "—"
        : Math.round(variant.tokens).toLocaleString(),
  },
];

function VariantName({ task }: { readonly task: EvalTask }) {
  const harness = harnessPresentation(task.harness);
  const model = modelPresentation(task.model);
  const provider = providerPresentation(task.provider);

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <harness.Icon className="size-3.5 shrink-0" />
      <span className="truncate text-foreground">{model.label}</span>
      <span className="text-muted-foreground">on</span>
      <provider.Icon className="size-3.5 shrink-0" />
      <span className="shrink-0 text-muted-foreground">{provider.label}</span>
    </span>
  );
}

/**
 * Which setup did better, and on what.
 *
 * A run is a grid -- cases down, variants across -- and read as the flat list
 * of cells it is stored as, a reader has to group it by eye to answer the
 * question the grid exists for. One row per variant answers it directly.
 *
 * The leader on each metric is marked rather than the table being sorted,
 * because there is no one order: the fastest variant is often not the one that
 * passed most, and sorting would have to pick which question the reader came
 * with. Two variants that tie are both marked, and nothing is marked when only
 * one variant ran.
 */
export function VariantComparison({
  cells,
  tasks,
}: {
  readonly cells: readonly EvalCell[];
  readonly tasks: readonly EvalTask[];
}) {
  const variants = variantsOf({ cells, tasks });

  if (variants.length < 2) {
    return null;
  }

  const leaders = new Map(
    COLUMNS.map((column) => [column.metric, leadersOn(variants, column.metric)])
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-label">
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-1.5 pr-4 text-left font-medium">Variant</th>
            {COLUMNS.map((column) => (
              <th
                className="py-1.5 pl-4 text-right font-medium"
                key={column.metric}
                scope="col"
                title={column.hint}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {variants.map((variant) => (
            <tr
              className="border-border-faint border-t"
              key={variant.taskIndex}
            >
              <td className="min-w-0 py-2 pr-4">
                <VariantName task={variant.task} />
              </td>

              {COLUMNS.map((column) => {
                const leads = leaders
                  .get(column.metric)
                  ?.has(variant.taskIndex);

                return (
                  <td
                    className={cn(
                      "py-2 pl-4 text-right tabular-nums",
                      leads
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                    key={column.metric}
                  >
                    {column.read(variant)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
