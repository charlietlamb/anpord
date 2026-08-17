import { PostHogProvider } from "@posthog/react";
import {
  ANALYTICS_ENABLED,
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
 * Mounted after hydration rather than at the root, so posthog-js stays out of
 * the boot chunk. It wraps nothing, because identifying happens in an effect and
 * no rendered component reads the client.
 */
export function PostHogAnalytics() {
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
      <Identify />
    </PostHogProvider>
  );
}
