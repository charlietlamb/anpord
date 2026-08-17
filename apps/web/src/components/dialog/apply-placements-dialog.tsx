import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@anpord/ui/components/ui/alert-dialog";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";
import { WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { VersionMove } from "@/components/deployments/version-move";
import { useDialog, useDialogOpen } from "@/lib/dialog/dialogs";
import { isRollback, type StagedChange } from "@/lib/placements/staged-changes";

export interface ApplyPlacementsDialogProps {
  readonly changes: readonly StagedChange[];
  readonly onConfirm: () => void | Promise<void>;
}

const countOf = (count: number) =>
  `${count} ${count === 1 ? "change" : "changes"}`;

/** Named separately from the count because the lede is about direction, and a
 * batch that only moves forward has nothing to warn about. */
const ledeFor = (rollbacks: number) => {
  if (rollbacks === 0) {
    return "Callers receive the new version immediately.";
  }
  return rollbacks === 1
    ? "One channel moves backward. Callers receive the older version immediately."
    : `${rollbacks} channels move backward. Callers receive the older versions immediately.`;
};

export function ApplyPlacementsDialog({
  changes,
  onConfirm,
}: ApplyPlacementsDialogProps) {
  const { close } = useDialog();
  const open = useDialogOpen("applyPlacements");
  const [pending, setPending] = useState(false);

  const rollbacks = changes.filter(isRollback).length;

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      close();
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog
      onOpenChange={(next) => (next ? undefined : close())}
      open={open}
    >
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Apply {countOf(changes.length)}?</AlertDialogTitle>
          <AlertDialogDescription>{ledeFor(rollbacks)}</AlertDialogDescription>
        </AlertDialogHeader>

        <div
          className={cn(
            "max-h-72 overflow-y-auto rounded-lg border border-border-surface bg-sidebar-accent",
            ROW_DIVIDERS
          )}
        >
          {changes.map((change) => (
            <div
              className="flex items-center gap-3 px-3 py-2.5"
              key={`${change.promptId}:${change.channel}`}
            >
              <span className="w-4 shrink-0">
                {isRollback(change) ? (
                  <WarningIcon
                    className="size-3.5 text-amber-500"
                    weight="fill"
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.8125rem]">
                {change.promptName}
                <span className="text-muted-foreground">
                  {" "}
                  · {change.channel}
                </span>
              </span>
              <VersionMove from={change.from} to={change.to} />
            </div>
          ))}
        </div>

        <p className="text-muted-foreground text-xs">
          Versions are never overwritten. You can point any channel back at any
          time.
        </p>

        <AlertDialogFooter>
          <AlertDialogAction
            className={cn(buttonVariants({ size: "sm" }))}
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? "Applying…" : `Apply ${countOf(changes.length)}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
