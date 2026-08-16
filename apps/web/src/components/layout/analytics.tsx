import { Databuddy } from "@databuddy/sdk/react";

const CLIENT_ID = "777a32ef-c09d-4ed6-966e-12ecea4ebd5f";

/**
 * Route changes are tracked by the script itself, so mounting once at the root
 * covers every page. Development is excluded rather than left to filter out
 * later, which keeps local navigation out of the numbers entirely.
 */
export function Analytics() {
  return (
    <Databuddy
      clientId={CLIENT_ID}
      disabled={import.meta.env.DEV}
      trackWebVitals
    />
  );
}
