import { handleMutationResult } from "@anpord/ui/lib/mutation-result";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";
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

export function useOrganizations(): UseOrganizations {
  const list = authClient.useListOrganizations();
  const active = authClient.useActiveOrganization();
  const queryClient = useQueryClient();
  const router = useRouter();

  /* Cleared, not invalidated: invalidating leaves the previous organisation's rows on screen while it refetches. */
  const setActive = useCallback(
    async (organizationId: string) => {
      const result = await authClient.organization.setActive({
        organizationId,
      });

      const switched = handleMutationResult(result, {
        errorTitle: "Couldn't switch organization",
      });

      if (!switched) {
        return;
      }

      queryClient.clear();

      /* Route loaders prefetch outside React Query's control, so the cache alone does not refill them. */
      await router.invalidate();
    },
    [queryClient, router]
  );

  return {
    activeOrganization: active.data ?? null,
    isPending: list.isPending || active.isPending,
    organizations: list.data ?? [],
    setActive,
  };
}
