import { invitationColumns } from "@/components/organization/invitation-columns";
import { memberColumns } from "@/components/organization/member-columns";
import { OrganizationTable } from "@/components/organization/organization-table";
import { useOrganizationMembers } from "@/lib/use-organization-members";

export function OrganizationMembers() {
  const { members, invitations, isPending } = useOrganizationMembers();

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <OrganizationTable
          columns={memberColumns}
          data={members}
          emptyState="No members yet."
          isLoading={isPending}
        />
      </section>

      {invitations.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg tracking-tight">
            Pending invitations
          </h2>
          <OrganizationTable
            columns={invitationColumns}
            data={invitations}
            emptyState="No pending invitations."
          />
        </section>
      ) : null}
    </div>
  );
}
