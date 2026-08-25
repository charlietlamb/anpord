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

  /**
   * Switches organisation and reloads what the page is showing.
   *
   * Every query is scoped to the session's organisation on the server but
   * keyed without it on the client, so the cache from the last organisation
   * answers for the next one: the switch appeared to work and the page went
   * on showing another organisation's evals until something else refetched.
   *
   * Cleared rather than invalidated, because invalidating leaves the old data
   * on screen while it refetches, and the wrong organisation's rows are worse
   * to look at than a loading state.
   */
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

      /* Route loaders prefetch outside React Query's control, so the cache
         alone does not refill them. */
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
