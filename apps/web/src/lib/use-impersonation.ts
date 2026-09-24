import {
  Permissions,
  permissionsForPlatformRole,
} from "@anpord/schema/domain/permissions";
import { handleMutationResult } from "@anpord/ui/lib/mutation-result";
import { useCallback } from "react";
import { authClient, useSession } from "@/lib/auth-client";

interface UseImpersonation {
  readonly active: boolean;
  readonly allowed: boolean;
  readonly start: (userId: string) => Promise<void>;
  readonly stop: () => Promise<void>;
}

export function useImpersonation(): UseImpersonation {
  const { data } = useSession();

  const active = Boolean(data?.session?.impersonatedBy);
  const granted = permissionsForPlatformRole(data?.user?.role);

  const start = useCallback(
    async (userId: string) => {
      if (active) {
        await authClient.admin.stopImpersonating();
      }

      const result = await authClient.admin.impersonateUser({ userId });

      handleMutationResult(result, {
        errorTitle: "Couldn't impersonate",
        onSuccess: () => window.location.assign("/"),
      });
    },
    [active]
  );

  const stop = useCallback(async () => {
    const result = await authClient.admin.stopImpersonating();

    handleMutationResult(result, {
      errorTitle: "Couldn't stop impersonating",
      onSuccess: () => window.location.assign("/"),
    });
  }, []);

  return {
    active,
    allowed: granted.includes(Permissions.Platform.Impersonate) || active,
    start,
    stop,
  };
}
