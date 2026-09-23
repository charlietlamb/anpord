import { Button } from "@anpord/ui/components/button";
import { cn } from "@anpord/ui/lib/utils";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { CaseRerun } from "@/lib/evals/eval-mutations";

export function RerunButton({
  label,
  rerun,
  started,
  variant = "default",
}: {
  readonly label: string;
  readonly rerun: CaseRerun;
  readonly started: string;
  readonly variant?: "default" | "ghost" | "outline";
}) {
  const start = async () => {
    try {
      await rerun.mutateAsync();
      toast.success(started);
    } catch (error) {
      toast.error("Couldn't start the run", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Button
      disabled={rerun.isPending}
      onClick={start}
      size="sm"
      variant={variant}
    >
      <ArrowsClockwiseIcon
        className={cn("size-3.5", rerun.isPending && "animate-spin")}
      />
      {rerun.isPending ? "Starting" : label}
    </Button>
  );
}
