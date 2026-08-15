import { initials } from "@anpord/ui/lib/initials";
import type { ColumnDef } from "@tanstack/react-table";
import {
  IdentityAvatar,
  IdentityLabel,
} from "@/components/dashboard/sidebar-identity";
import { dateColumn, roleColumn } from "@/components/table/cell-columns";
import type { OrganizationMember } from "@/lib/use-organization-members";

export const memberColumns: ColumnDef<OrganizationMember, unknown>[] = [
  {
    header: "Member",
    accessorKey: "user",
    enableSorting: false,
    cell: ({ row }) => {
      const { user } = row.original;
      const name = user.name || user.email;
      return (
        <div className="flex items-center gap-2">
          <IdentityAvatar
            className="size-7"
            image={user.image}
            label={name}
            text={initials(name, user.email)}
          />
          <IdentityLabel subtitle={user.email} title={name} />
        </div>
      );
    },
  },
  roleColumn<OrganizationMember>("role"),
  dateColumn<OrganizationMember>("Joined", "createdAt"),
];
