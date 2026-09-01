import {
  Permissions,
  permissionsForPlatformRole,
} from "@anpord/schema/domain/permissions";
import { handleMutationResult } from "@anpord/ui/lib/mutation-result";
import { useCallback } from "react";
import { authClient, useSession } from "@/lib/auth-client";

interface UseImpersonation {
  readonly active: boolean;
  /** Whether to offer impersonation at all. True throughout an impersonation
   * as well, because the staff member is still there and needs the way back —
   * the session's own user is not staff. */
  readonly allowed: boolean;
  readonly start: (userId: string) => Promise<void>;
  readonly stop: () => Promise<void>;
}

/**
 * Acting as someone else, and stopping.
 *
 * Both paths end in a document load rather than a router invalidation. The
 * session changes identity, and every cache in the app — React Query, route
 * loaders, anything holding a rendered organisation — is keyed without it, so
 * a soft refresh leaves one person's data on screen under another's session.
 *
 * The client's check only decides what to render. The server re-derives the
 * same permission from the user row on every request, so a forged session
 * field buys nothing.
 */
export function useImpersonation(): UseImpersonation {
  const { data } = useSession();

  const active = Boolean(data?.session?.impersonatedBy);
  const granted = permissionsForPlatformRole(data?.user?.role);

  const start = useCallback(
    async (userId: string) => {
      /* An impersonated session belongs to a non-staff user and fails the
         permission check that starting a new one requires. Handing the admin
         session back first is what makes switching targets work. */
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
