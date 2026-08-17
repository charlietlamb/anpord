import type { ConfirmDialogProps } from "@anpord/ui/components/dialog/confirm-dialog";
import { createDialogSystem } from "@anpord/ui/components/dialog/create-dialog-system";
import type { ChannelColor } from "@anpord/ui/lib/channel-colors";

export interface DialogMap {
  apiKeyCreated: { apiKey: string; name: string };
  channel: {
    color?: ChannelColor;
    name?: string;
    onSubmit: (value: { color: ChannelColor; name: string }) => void;
  };
  confirm: Omit<ConfirmDialogProps, "open" | "onClose">;
  createOrganization: Record<never, never>;
  editPrompt: {
    id: string;
    name: string;
    onSubmit: (details: { id: string; name: string }) => void;
  };
  editVersion: {
    onCorrect: () => void;
    onEditFrom: () => void;
    servedBy: readonly string[];
    version: number;
  };
  inviteMember: Record<never, never>;
  newApiKey: { onSubmit: (name: string) => Promise<void> };
  newChannel: { onSubmit: (channel: string) => void; version: number };
}

export const { DialogProvider, useDialog, useDialogOpen } =
  createDialogSystem<DialogMap>();
