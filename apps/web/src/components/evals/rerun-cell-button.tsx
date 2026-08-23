import { Button } from "@anpord/ui/components/button";
import { cn } from "@anpord/ui/lib/utils";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useRerunCell } from "@/lib/evals/eval-mutations";

const AT_LEAST = 1;

export function RerunCellButton({
  cellKey,
  runId,
  trials,
}: {
  readonly cellKey: string;
  readonly runId: string;

  readonly trials: number;
}) {
  const navigate = useNavigate();
  const rerun = useRerunCell(cellKey);

  const start = async () => {
    try {
      const started = await rerun.mutateAsync({
        runId,
        trials: Math.max(trials, AT_LEAST),
      });

      navigate({ params: { runId: started.id }, to: "/evals/$runId" });
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
