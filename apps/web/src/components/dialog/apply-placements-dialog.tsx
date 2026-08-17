import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@anpord/ui/components/ui/alert-dialog";
import { Badge } from "@anpord/ui/components/ui/badge";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";
import { useState } from "react";
import { VersionChange } from "@/components/placements/version-change";
import { useDialog, useDialogOpen } from "@/lib/dialog/dialogs";
import { isRollback, type StagedChange } from "@/lib/placements/staged-changes";

export interface ApplyPlacementsDialogProps {
  readonly changes: readonly StagedChange[];
  readonly onConfirm: () => void | Promise<void>;
}

const countOf = (count: number) =>
  `${count} ${count === 1 ? "change" : "changes"}`;

/** The lede is about direction, because a batch that only moves forward has
 * nothing to warn about. */
const ledeFor = (rollbacks: number) => {
  if (rollbacks === 0) {
    return "Callers receive the new version immediately.";
  }
  const subject =
    rollbacks === 1 ? "One channel moves" : `${rollbacks} channels move`;
  return `${subject} backward. Callers receive the older version immediately.`;
};

export function ApplyPlacementsDialog({
  changes,
  onConfirm,
}: ApplyPlacementsDialogProps) {
  const { close } = useDialog();
  const open = useDialogOpen("applyPlacements");
  const [pending, setPending] = useState(false);

  const rollbacks = changes.filter(isRollback).length;

  const confirm = async () => {
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
            <ChangeRow
              change={change}
              key={`${change.promptId}:${change.channel}`}
            />
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
            onClick={confirm}
          >
            {pending ? "Applying…" : `Apply ${countOf(changes.length)}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ChangeRow({ change }: { readonly change: StagedChange }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="min-w-0 flex-1 truncate text-[0.8125rem]">
        {change.promptName}
        <span className="text-muted-foreground"> · {change.channel}</span>
      </span>

      {isRollback(change) ? (
        <Badge size="xs" variant="outline">
          Rollback
        </Badge>
      ) : null}

      <VersionChange className="shrink-0" from={change.from} to={change.to} />
    </div>
  );
}
