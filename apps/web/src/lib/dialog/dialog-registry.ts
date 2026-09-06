import type { DialogRegistry } from "@anpord/ui/components/dialog/create-dialog-system";
import { type ComponentType, lazy } from "react";
import type { DialogMap } from "@/lib/dialog/dialogs";

/* Each dialog is a named export, so the module is unwrapped before `lazy` will take it. */
// biome-ignore lint/suspicious/noExplicitAny: props are checked by the registry type
type AnyDialog = ComponentType<any>;

const named = <K extends string>(
  load: () => Promise<Record<K, AnyDialog>>,
  name: K
) => lazy(async () => ({ default: (await load())[name] }));

export const dialogRegistry: DialogRegistry<DialogMap> = {
  apiKeyCreated: named(
    () => import("@/components/dialog/api-key-created-dialog"),
    "ApiKeyCreatedDialog"
  ),
  newApiKey: named(
    () => import("@/components/dialog/new-api-key-dialog"),
    "NewApiKeyDialog"
  ),
  channel: named(
    () => import("@/components/dialog/channel-dialog"),
    "ChannelDialog"
  ),
  confirm: named(
    () => import("@/components/dialog/app-confirm-dialog"),
    "ConfirmDialog"
  ),
  createOrganization: named(
    () => import("@/components/dialog/create-organization-dialog"),
    "CreateOrganizationDialog"
  ),
  editVersion: named(
    () => import("@/components/dialog/edit-version-dialog"),
    "EditVersionDialog"
  ),
  inviteMember: named(
    () => import("@/components/dialog/invite-member-dialog"),
    "InviteMemberDialog"
  ),
};
