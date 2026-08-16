import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@anpord/ui/components/ui/alert-dialog";
import { Kbd } from "@anpord/ui/components/ui/kbd";
import { useMetaKeyLabel } from "@anpord/ui/hooks/use-meta-key-label";
import { useShortcut } from "@anpord/ui/hooks/use-shortcut";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { useState } from "react";

export interface ConfirmDialogProps {
  confirmLabel?: string;
  description: string;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  open: boolean;
  title: string;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const metaKeyLabel = useMetaKeyLabel();

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setPending(false);
    }
  }

  useShortcut("enter", {
    meta: true,
    disabled: !open || pending,
    onTrigger: handleConfirm,
  });

  return (
    <AlertDialog onOpenChange={(next) => (next ? null : onClose())} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className={cn(
              "gap-1.5",
              destructive && buttonVariants({ variant: "destructive" })
            )}
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {pending ? "Working…" : confirmLabel}
            {pending ? null : (
              <span className="flex items-center gap-0.5">
                <Kbd>{metaKeyLabel}</Kbd>
                <Kbd>↵</Kbd>
              </span>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
