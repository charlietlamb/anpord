import { DataTableRow } from "@anpord/ui/components/ui/data-table";
import { formatDate } from "@anpord/ui/lib/format-date";
import { MemberRole } from "@/components/organization/member-role";
import type { OrganizationInvitation } from "@/lib/use-organization-members";

export function InvitationRow({
  invitation,
}: {
  readonly invitation: OrganizationInvitation;
}) {
  return (
    <DataTableRow>
      <span className="truncate text-foreground">{invitation.email}</span>
      <MemberRole role={invitation.role ?? "member"} />
      <span className="text-muted-foreground tabular-nums">
        {formatDate(invitation.expiresAt)}
      </span>
    </DataTableRow>
  );
}
