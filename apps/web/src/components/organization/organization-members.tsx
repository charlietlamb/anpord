import { Badge } from "@anpord/ui/components/ui/badge";
import { formatDate } from "@anpord/ui/lib/format-date";
import { initials } from "@anpord/ui/lib/initials";
import {
  IdentityAvatar,
  IdentityLabel,
} from "@/components/dashboard/sidebar-identity";
import { EmptyNote } from "@/components/layout/empty-note";
import { ListRow } from "@/components/layout/list-row";
import { RowList } from "@/components/layout/row-list";
import type {
  OrganizationInvitation,
  OrganizationMember,
} from "@/lib/use-organization-members";
import { useOrganizationMembers } from "@/lib/use-organization-members";

function Role({ role }: { readonly role: string }) {
  return (
    <Badge className="capitalize" variant="secondary">
      {role}
    </Badge>
  );
}

function When({ value }: { readonly value: Date | string | null }) {
  return (
    <span className="text-muted-foreground tabular-nums">
      {value ? formatDate(value) : "Never"}
    </span>
  );
}

function MemberRow({ member }: { readonly member: OrganizationMember }) {
  const { user } = member;
  const name = user.name || user.email;

  return (
    <ListRow
      leading={
        <IdentityAvatar
          className="size-7"
          image={user.image}
          label={name}
          text={initials(name, user.email)}
        />
      }
      meta={
        <>
          <Role role={member.role} />
          <When value={member.createdAt} />
        </>
      }
    >
      <IdentityLabel subtitle={user.email} title={name} />
    </ListRow>
  );
}

function InvitationRow({
  invitation,
}: {
  readonly invitation: OrganizationInvitation;
}) {
  return (
    <ListRow
      meta={
        <>
          <Role role={invitation.role ?? "member"} />
          <When value={invitation.expiresAt} />
        </>
      }
    >
      <span className="font-medium">{invitation.email}</span>
    </ListRow>
  );
}

export function OrganizationMembers() {
  const { members, invitations, isPending } = useOrganizationMembers();

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        {isPending || members.length > 0 ? (
          <RowList label="Members">
            {members.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </RowList>
        ) : (
          <EmptyNote>No members yet.</EmptyNote>
        )}
      </section>

      {invitations.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg tracking-tight">
            Pending invitations
          </h2>
          <RowList label="Pending invitations">
            {invitations.map((invitation) => (
              <InvitationRow invitation={invitation} key={invitation.id} />
            ))}
          </RowList>
        </section>
      ) : null}
    </div>
  );
}
