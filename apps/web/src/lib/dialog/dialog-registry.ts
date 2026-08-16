import type { DialogRegistry } from "@anpord/ui/components/dialog/create-dialog-system";
import { ConfirmDialog } from "@/components/dialog/app-confirm-dialog";
import { ChannelDialog } from "@/components/dialog/channel-dialog";
import { CreateOrganizationDialog } from "@/components/dialog/create-organization-dialog";
import { EditPromptDialog } from "@/components/dialog/edit-prompt-dialog";
import { EditVersionDialog } from "@/components/dialog/edit-version-dialog";
import { InviteMemberDialog } from "@/components/dialog/invite-member-dialog";
import { NewChannelDialog } from "@/components/dialog/new-channel-dialog";
import type { DialogMap } from "@/lib/dialog/dialogs";

export const dialogRegistry: DialogRegistry<DialogMap> = {
  channel: ChannelDialog,
  confirm: ConfirmDialog,
  createOrganization: CreateOrganizationDialog,
  editPrompt: EditPromptDialog,
  editVersion: EditVersionDialog,
  inviteMember: InviteMemberDialog,
  newChannel: NewChannelDialog,
};
