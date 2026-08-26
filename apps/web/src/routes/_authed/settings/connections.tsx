import { createFileRoute, redirect } from "@tanstack/react-router";

/** Split into a page per category. Kept so links already handed out -- the
 * docs say **Settings > Connections** -- land somewhere real. */
export const Route = createFileRoute("/_authed/settings/connections")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/harnesses" });
  },
});
