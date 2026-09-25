import { AgeCell } from "@anpord/ui/components/evals/age-cell";
import { DataTableRow } from "@anpord/ui/components/ui/data-table";
import { initials } from "@anpord/ui/lib/initials";
import { IdentityAvatar } from "@/components/dashboard/identity-avatar";
import { IdentityLabel } from "@/components/dashboard/identity-label";
import { MemberRole } from "@/components/organization/member-role";

export interface MemberSummary {
  readonly createdAt: Date | string;
  readonly id: string;
  readonly role: string;
  readonly user: {
    readonly email: string;
    readonly image?: string | null;
    readonly name: string;
  };
}

export function MemberRow({ member }: { readonly member: MemberSummary }) {
  const { user } = member;
  const name = user.name || user.email;

  return (
    <DataTableRow>
      <span className="flex min-w-0 items-center gap-2.5">
        <IdentityAvatar
          className="size-6"
          image={user.image}
          label={name}
          text={initials(name, user.email)}
        />
        <IdentityLabel subtitle={user.email} title={name} />
      </span>
      <MemberRole role={member.role} />
      <AgeCell at={new Date(member.createdAt).getTime()} />
    </DataTableRow>
  );
}
