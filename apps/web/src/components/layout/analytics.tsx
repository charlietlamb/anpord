import { Databuddy } from "@databuddy/sdk/react";
import { type ComponentType, type ReactNode, useEffect, useState } from "react";
import { ANALYTICS_ENABLED, DATABUDDY_CLIENT_ID } from "@/lib/analytics/config";

/**
 * Databuddy answers what the site is doing in aggregate; PostHog ties that to a
 * person and records the replay. Both track route changes themselves, so
 * mounting once at the root covers every page without a call per route.
 *
 * PostHog carries session replay, surveys, and autocapture, which is a quarter
 * of a megabyte that nothing on screen depends on. Fetching it from an effect
 * keeps it out of the chunk that decides how fast the page first appears.
 */
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
        /** Analytics that cannot load is a page without analytics, never a
         * page that fails. */
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
