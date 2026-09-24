import { PostHogProvider } from "@posthog/react";
import { PostHogIdentify } from "@/components/layout/posthog-identify";
import {
  ANALYTICS_ENABLED,
  POSTHOG_HOST,
  POSTHOG_KEY,
} from "@/lib/analytics/config";

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
      <PostHogIdentify />
    </PostHogProvider>
  );
}
