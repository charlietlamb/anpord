import { PostHogProvider } from "@posthog/react";
import {
  ANALYTICS_ENABLED,
  POSTHOG_HOST,
  POSTHOG_KEY,
} from "@/lib/analytics/config";
import { useIdentify } from "@/lib/analytics/use-identify";

/* Must sit inside the provider, which is what gives it a client. */
function Identify() {
  useIdentify();
  return null;
}

/* Mounted after hydration, so posthog-js stays out of the boot chunk. */
export function PostHogAnalytics() {
  return (
    <PostHogProvider
      apiKey={POSTHOG_KEY}
      options={{
        api_host: POSTHOG_HOST,
        capture_pageview: true,
        disable_session_recording: !ANALYTICS_ENABLED,
        person_profiles: "identified_only",
      }}
    >
      <Identify />
    </PostHogProvider>
  );
}
