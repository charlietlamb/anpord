import { Button } from "@anpord/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";
import { OrganizationMembers } from "@/components/organization/organization-members";
import { useDialog } from "@/lib/dialog/dialogs";

export const Route = createFileRoute("/_authed/settings/members")({
  component: MembersSettings,
  staticData: { title: "Members" },
});

function MembersSettings() {
  const { open } = useDialog();

  return (
    <>
      <PageHeader
        actions={
          <Button onClick={() => open("inviteMember", {})} size="sm">
            <PlusIcon />
            Invite member
          </Button>
        }
        description="Manage who has access to this organization."
        title="Members"
      />
      <OrganizationMembers />
    </>
  );
}
