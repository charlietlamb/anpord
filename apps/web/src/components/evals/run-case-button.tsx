import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import type { EvalVariant } from "@sphynx/schema/domain/evals";
import { Button } from "@sphynx/ui/components/button";
import { cn, SPIN } from "@sphynx/ui/lib/utils";
import { toast } from "sonner";
import { useRunCase } from "@/lib/evals/eval-mutations";

export function RunCaseButton({
  caseId,
  variant,
}: {
  readonly caseId: string;
  readonly variant: EvalVariant | null;
}) {
  const run = useRunCase(caseId, variant?.id ?? null);
  const label = variant === null ? "Run all variants" : "Run this variant";

  const start = () =>
    run.mutate(undefined, {
      onError: (error) =>
        toast.error("Couldn't start the run", { description: error.message }),
      onSuccess: () =>
        toast.success(
          variant === null
            ? "Running every variant of this case"
            : `Running ${variant.model} again`
        ),
    });

  return (
    <Button disabled={run.isPending} onClick={start} size="sm">
      <ArrowsClockwiseIcon className={cn("size-3.5", run.isPending && SPIN)} />
      {run.isPending ? "Starting" : label}
    </Button>
  );
}
