import type { EvalRun } from "@anpord/schema/domain/evals";
import { variantsOf } from "@anpord/schema/domain/variant-comparison";
import { cn } from "@anpord/ui/lib/utils";
import { LINE, leadersOf, Metrics } from "@/components/evals/run-grid-columns";
import { VariantName } from "@/components/evals/variant-name";
import { RowTitle } from "@/components/layout/list-row";

/* Leaders are marked rather than rows sorted: no single order answers both "fastest" and "passed most". */
export function Overall({ run }: { readonly run: EvalRun }) {
  const variants = variantsOf(run);
  const leaders = leadersOf(variants);

  return (
    <>
      <div className="col-span-full flex h-9 items-center gap-2.5 pt-2">
        <RowTitle>Overall</RowTitle>
        <span className="text-muted-foreground/70 text-xs">
          across {run.cases.length} cases
        </span>
      </div>

      {variants.map((variant) => (
        <div className={cn(LINE, "h-10 text-label")} key={variant.taskIndex}>
          <span />
          <span className="min-w-0 truncate">
            <VariantName task={variant.task} />
          </span>
          <Metrics leaders={leaders} result={variant} />
          <span />
        </div>
      ))}
    </>
  );
}
