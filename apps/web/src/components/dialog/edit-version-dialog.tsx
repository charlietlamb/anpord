import { Button } from "@anpord/ui/components/button";
import { BaseDialog } from "@anpord/ui/components/dialog/base-dialog";
import {
  ArrowCounterClockwiseIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { useDialog, useDialogOpen } from "@/lib/dialog/dialogs";

interface EditVersionDialogProps {
  readonly onCorrect: () => void;
  readonly onEditFrom: () => void;
  readonly servedBy: readonly string[];
  readonly version: number;
}

export function EditVersionDialog({
  onCorrect,
  onEditFrom,
  servedBy,
  version,
}: EditVersionDialogProps) {
  const { close } = useDialog();
  const open = useDialogOpen("editVersion");

  const choose = (action: () => void) => () => {
    action();
    close();
  };

  return (
    <BaseDialog
      description={`v${version} is part of the history, so editing it can either add to that history or rewrite it.`}
      onClose={close}
      open={open}
      title={`Edit v${version}`}
    >
      <div className="flex flex-col gap-2">
        <Button
          className="h-auto flex-col items-start gap-1 px-3.5 py-3 text-left"
          onClick={choose(onEditFrom)}
          variant="outline"
        >
          <span className="flex items-center gap-2 font-medium">
            <ArrowCounterClockwiseIcon size={15} />
            Edit from v{version}
          </span>
          <span className="font-normal text-muted-foreground text-xs leading-snug">
            Saving adds a new version. v{version} stays as it is.
          </span>
        </Button>

        <Button
          className="h-auto flex-col items-start gap-1 px-3.5 py-3 text-left"
          onClick={choose(onCorrect)}
          variant="outline"
        >
          <span className="flex items-center gap-2 font-medium">
            <PencilSimpleIcon size={15} />
            Overwrite v{version}
          </span>
          <span className="font-normal text-muted-foreground text-xs leading-snug">
            {servedBy.length > 0
              ? `Replaces the content in place. ${servedBy.join(", ")} serves this version, so callers see the change.`
              : "Replaces the content in place, for fixing a mistake."}
          </span>
        </Button>
      </div>
    </BaseDialog>
  );
}
