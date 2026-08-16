import { Databuddy } from "@databuddy/sdk/react";
import { PostHogProvider } from "@posthog/react";
import type { ReactNode } from "react";
import {
  ANALYTICS_ENABLED,
  DATABUDDY_CLIENT_ID,
  POSTHOG_HOST,
  POSTHOG_KEY,
} from "@/lib/analytics/config";
import { useIdentify } from "@/lib/analytics/use-identify";

/** Sits inside the provider, which is what gives it a client to identify on. */
function Identify() {
  useIdentify();
  return null;
}

/**
 * Both providers track route changes themselves, so mounting once at the root
 * covers every page without a call per route. Databuddy answers what the site
 * is doing in aggregate; PostHog ties that to a person and records the replay.
 */
export function Analytics({ children }: { children: ReactNode }) {
  return (
    <PostHogProvider
      apiKey={POSTHOG_KEY}
      options={{
        api_host: POSTHOG_HOST,
        /**
         * The default captures the first page as well as later navigation.
         * `history_change` only listens for history API calls, so a visitor who
         * lands and leaves without navigating is never counted at all.
         */
        capture_pageview: true,
        /** Replay is the reason PostHog is here, so it is on from the start. */
        disable_session_recording: !ANALYTICS_ENABLED,
        person_profiles: "identified_only",
      }}
    >
      {children}
      <Identify />
      <Databuddy
        clientId={DATABUDDY_CLIENT_ID}
        disabled={!ANALYTICS_ENABLED}
        trackWebVitals
      />
    </PostHogProvider>
  );
}
