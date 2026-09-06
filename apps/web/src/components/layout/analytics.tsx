import { Databuddy } from "@databuddy/sdk/react";
import { type ComponentType, type ReactNode, useEffect, useState } from "react";
import { ANALYTICS_ENABLED, DATABUDDY_CLIENT_ID } from "@/lib/analytics/config";

/* PostHog is loaded from an effect to keep its quarter-megabyte out of the first chunk. */
export function Analytics({ children }: { children: ReactNode }) {
  const [PostHog, setPostHog] = useState<ComponentType | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@/components/layout/posthog-analytics")
      .then((module) => {
        if (mounted) {
          setPostHog(() => module.PostHogAnalytics);
        }
      })
      .catch(() => {
        /* Analytics that cannot load is never a page that fails. */
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      {children}
      {PostHog ? <PostHog /> : null}
      <Databuddy
        clientId={DATABUDDY_CLIENT_ID}
        disabled={!ANALYTICS_ENABLED}
        trackWebVitals
      />
    </>
  );
}
