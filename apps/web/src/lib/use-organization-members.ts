import { authClient } from "@/lib/auth-client";

type ActiveOrganization = NonNullable<
  ReturnType<typeof authClient.useActiveOrganization>["data"]
>;

type OrganizationMember = ActiveOrganization["members"][number];
export type OrganizationInvitation = ActiveOrganization["invitations"][number];

interface UseOrganizationMembers {
  error: Error | null;
  invitations: OrganizationInvitation[];
  isPending: boolean;
  members: OrganizationMember[];
}

export function useOrganizationMembers(): UseOrganizationMembers {
  const active = authClient.useActiveOrganization();
  const organization = active.data;

  return {
    error: active.error,
    members: organization?.members ?? [],
    invitations: (organization?.invitations ?? []).filter(
      (invitation) => invitation.status === "pending"
    ),
    isPending: active.isPending,
  };
}
