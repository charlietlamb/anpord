import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@sphynx/ui/components/ui/alert-dialog";
import { Kbd } from "@sphynx/ui/components/ui/kbd";
import { useMetaKeyLabel } from "@sphynx/ui/hooks/use-meta-key-label";
import { useShortcut } from "@sphynx/ui/hooks/use-shortcut";
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
      <AlertDialogContent onOverlayClick={pending ? undefined : onClose}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-stretch">
          <AlertDialogAction
            className="w-full gap-1.5"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
            variant={destructive ? "destructive" : "default"}
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
