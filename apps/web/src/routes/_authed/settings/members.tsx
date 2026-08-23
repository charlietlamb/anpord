import { Button } from "@anpord/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { OrganizationMembers } from "@/components/organization/organization-members";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { useDialog } from "@/lib/dialog/dialogs";

export const Route = createFileRoute("/_authed/settings/members")({
  component: MembersSettings,
  staticData: { title: "Members" },
});

function MembersSettings() {
  const { open } = useDialog();

  return (
    <SettingsPanel
      actions={
        <Button
          onClick={() => open("inviteMember", {})}
          size="sm"
          variant="outline"
        >
          <PlusIcon className="size-4" />
          Invite member
        </Button>
      }
      description="Manage who has access to this organization."
    >
      <OrganizationMembers />
    </SettingsPanel>
  );
}
