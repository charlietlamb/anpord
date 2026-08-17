import { usePostHog } from "@posthog/react";
import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";

/**
 * Ties events to the signed-in person and unties them at sign-out. Identifying
 * is idempotent but re-sends person properties, so it runs once per user rather
 * than on every render the session hook produces.
 */
export function useIdentify() {
  const posthog = usePostHog();
  const { data: session } = useSession();
  const identified = useRef<string | null>(null);

  useEffect(() => {
    const user = session?.user;

    if (!user) {
      if (identified.current) {
        identified.current = null;
        posthog.reset();
      }
      return;
    }

    if (identified.current === user.id) {
      return;
    }

    identified.current = user.id;
    posthog.identify(user.id, {
      email: user.email,
      name: user.name,
    });
  }, [posthog, session?.user]);
}
