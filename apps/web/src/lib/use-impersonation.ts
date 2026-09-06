import {
  Permissions,
  permissionsForPlatformRole,
} from "@anpord/schema/domain/permissions";
import { handleMutationResult } from "@anpord/ui/lib/mutation-result";
import { useCallback } from "react";
import { authClient, useSession } from "@/lib/auth-client";

interface UseImpersonation {
  readonly active: boolean;
  /* True during an impersonation too: the staff member needs the way back, and the session's user is not staff. */
  readonly allowed: boolean;
  readonly start: (userId: string) => Promise<void>;
  readonly stop: () => Promise<void>;
}

/* Both paths end in a document load: caches are keyed without the session identity, so a soft refresh would leave one person's data under another's session. */
export function useImpersonation(): UseImpersonation {
  const { data } = useSession();

  const active = Boolean(data?.session?.impersonatedBy);
  const granted = permissionsForPlatformRole(data?.user?.role);

  const start = useCallback(
    async (userId: string) => {
      /* An impersonated session is non-staff and fails the check a new impersonation requires, so the admin session is handed back first. */
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
