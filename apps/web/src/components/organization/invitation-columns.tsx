import type { ColumnDef } from "@tanstack/react-table";
import { dateColumn, roleColumn } from "@/components/table/cell-columns";
import type { OrganizationInvitation } from "@/lib/use-organization-members";

export const invitationColumns: ColumnDef<OrganizationInvitation, unknown>[] = [
  {
    header: "Email",
    accessorKey: "email",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.email}</span>
    ),
  },
  roleColumn<OrganizationInvitation>("role", "member"),
  dateColumn<OrganizationInvitation>("Expires", "expiresAt"),
];
