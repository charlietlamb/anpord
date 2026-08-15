import { authClient } from "@/lib/auth-client";

type ActiveOrganization = NonNullable<
  ReturnType<typeof authClient.useActiveOrganization>["data"]
>;

export type OrganizationMember = ActiveOrganization["members"][number];
export type OrganizationInvitation = ActiveOrganization["invitations"][number];

interface UseOrganizationMembers {
  invitations: OrganizationInvitation[];
  isPending: boolean;
  members: OrganizationMember[];
}

export function useOrganizationMembers(): UseOrganizationMembers {
  const active = authClient.useActiveOrganization();
  const organization = active.data;

  return {
    members: organization?.members ?? [],
    invitations: (organization?.invitations ?? []).filter(
      (invitation) => invitation.status === "pending"
    ),
    isPending: active.isPending,
  };
}
