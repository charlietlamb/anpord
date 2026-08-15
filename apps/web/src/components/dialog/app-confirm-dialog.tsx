import {
  ConfirmDialog as ConfirmDialogPrimitive,
  type ConfirmDialogProps,
} from "@anpord/ui/components/dialog/confirm-dialog";
import { useDialog, useDialogOpen } from "@/lib/dialog/dialogs";

type AppConfirmDialogProps = Omit<ConfirmDialogProps, "open" | "onClose">;

export function ConfirmDialog(props: AppConfirmDialogProps) {
  const { close } = useDialog();
  const open = useDialogOpen("confirm");

  return <ConfirmDialogPrimitive {...props} onClose={close} open={open} />;
}
