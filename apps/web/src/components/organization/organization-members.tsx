import {
  DataTable,
  DataTableBody,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import { UsersThreeIcon } from "@phosphor-icons/react";
import { ListState } from "@/components/layout/list-state";
import { PageSection } from "@/components/layout/page-section";
import { InvitationRow } from "@/components/organization/invitation-row";
import { MemberRow } from "@/components/organization/member-row";
import { PLACEHOLDER_MEMBERS } from "@/lib/settings/settings-placeholders";
import {
  INVITATIONS_TABLE,
  MEMBERS_TABLE,
} from "@/lib/settings/settings-tables";
import { useOrganizationMembers } from "@/lib/use-organization-members";

export function OrganizationMembers() {
  const { error, invitations, isPending, members } = useOrganizationMembers();

  return (
    <>
      <ListState
        description="Invite someone to share this organization's evals and connections."
        empty={members.length === 0}
        error={error}
        icon={<UsersThreeIcon />}
        loading={isPending}
        title="No members yet"
      >
        <DataTable columns={MEMBERS_TABLE.columns} label={MEMBERS_TABLE.label}>
          <DataTableHead headings={MEMBERS_TABLE.headings} />
          <DataTableBody>
            {(isPending ? PLACEHOLDER_MEMBERS : members).map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </DataTableBody>
        </DataTable>
      </ListState>

      {invitations.length > 0 ? (
        <PageSection title="Pending invitations">
          <DataTable
            columns={INVITATIONS_TABLE.columns}
            label={INVITATIONS_TABLE.label}
          >
            <DataTableHead headings={INVITATIONS_TABLE.headings} />
            <DataTableBody>
              {invitations.map((invitation) => (
                <InvitationRow invitation={invitation} key={invitation.id} />
              ))}
            </DataTableBody>
          </DataTable>
        </PageSection>
      ) : null}
    </>
  );
}
