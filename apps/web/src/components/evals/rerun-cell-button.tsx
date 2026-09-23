import { Button } from "@anpord/ui/components/button";
import { cn } from "@anpord/ui/lib/utils";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useRerunCell } from "@/lib/evals/eval-mutations";

const AT_LEAST = 1;

export function RerunCellButton({
  caseId,
  cellKey,
  runId,
  trials,
}: {
  readonly caseId: string;
  readonly cellKey: string;
  readonly runId: string;

  readonly trials: number;
}) {
  const rerun = useRerunCell(caseId, cellKey);

  const start = async () => {
    try {
      await rerun.mutateAsync({
        runId,
        trials: Math.max(trials, AT_LEAST),
      });
      toast.success("Running this case again");
    } catch (error) {
      toast.error("Couldn't run this case again", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Button
      className="px-2.5 text-xs"
      disabled={rerun.isPending}
      onClick={start}
      size="sm"
      variant="ghost"
    >
      <ArrowsClockwiseIcon
        className={cn("size-3.5", rerun.isPending && "animate-spin")}
      />
      {rerun.isPending ? "Starting" : "Run again"}
    </Button>
  );
}
