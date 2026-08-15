import { handleMutationResult } from "@anpord/ui/lib/mutation-result";
import { authClient } from "@/lib/auth-client";

interface OrganizationSummary {
  id: string;
  logo?: string | null;
  name: string;
  slug: string;
}

interface UseOrganizations {
  activeOrganization: OrganizationSummary | null;
  isPending: boolean;
  organizations: OrganizationSummary[];
  setActive: (organizationId: string) => Promise<void>;
}

/** Closes over nothing, so it does not need rebuilding on every render. */
async function setActiveOrganization(organizationId: string) {
  const result = await authClient.organization.setActive({
    organizationId,
  });
  handleMutationResult(result, {
    errorTitle: "Couldn't switch organization",
  });
}

export function useOrganizations(): UseOrganizations {
  const list = authClient.useListOrganizations();
  const active = authClient.useActiveOrganization();

  return {
    organizations: list.data ?? [],
    activeOrganization: active.data ?? null,
    isPending: list.isPending || active.isPending,
    setActive: setActiveOrganization,
  };
}
