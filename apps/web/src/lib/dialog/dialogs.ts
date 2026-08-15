import type { ConfirmDialogProps } from "@anpord/ui/components/dialog/confirm-dialog";
import { createDialogSystem } from "@anpord/ui/components/dialog/create-dialog-system";

export interface DialogMap {
  confirm: Omit<ConfirmDialogProps, "open" | "onClose">;
  createOrganization: Record<never, never>;
  inviteMember: Record<never, never>;
}

export const { DialogProvider, useDialog, useDialogOpen } =
  createDialogSystem<DialogMap>();
