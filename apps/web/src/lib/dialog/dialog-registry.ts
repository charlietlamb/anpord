import type { DialogRegistry } from "@anpord/ui/components/dialog/create-dialog-system";
import { ConfirmDialog } from "@/components/dialog/app-confirm-dialog";
import { CreateOrganizationDialog } from "@/components/dialog/create-organization-dialog";
import { InviteMemberDialog } from "@/components/dialog/invite-member-dialog";
import { NewChannelDialog } from "@/components/dialog/new-channel-dialog";
import type { DialogMap } from "@/lib/dialog/dialogs";

export const dialogRegistry: DialogRegistry<DialogMap> = {
  confirm: ConfirmDialog,
  createOrganization: CreateOrganizationDialog,
  inviteMember: InviteMemberDialog,
  newChannel: NewChannelDialog,
};
