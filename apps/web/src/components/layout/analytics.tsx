import { Databuddy } from "@databuddy/sdk/react";
import { ClientOnly } from "@tanstack/react-router";
// biome-ignore lint/correctness/noUnresolvedImports: biome cannot see the Suspense export in the react types
import { type ComponentType, lazy, type ReactNode, Suspense } from "react";
import { ANALYTICS_ENABLED, DATABUDDY_CLIENT_ID } from "@/lib/analytics/config";

const PostHogAnalytics = lazy<ComponentType>(() =>
  import("@/components/layout/posthog-analytics").then(
    (module) => ({ default: module.PostHogAnalytics }),
    () => ({ default: () => null })
  )
);

export function Analytics({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ClientOnly>
        <Suspense fallback={null}>
          <PostHogAnalytics />
        </Suspense>
      </ClientOnly>
      <Databuddy
        clientId={DATABUDDY_CLIENT_ID}
        disabled={!ANALYTICS_ENABLED}
        trackWebVitals
      />
    </>
  );
}
