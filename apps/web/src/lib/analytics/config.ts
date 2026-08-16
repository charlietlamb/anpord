/**
 * Analytics identifiers ship in the browser bundle whatever their source, so
 * they are named here rather than threaded through the environment. Only the
 * host is worth overriding, which is what a self-hosted PostHog changes.
 */
export const DATABUDDY_CLIENT_ID = "777a32ef-c09d-4ed6-966e-12ecea4ebd5f";

export const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY ?? "";

export const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com";

/** Local navigation is noise, so it never reaches either provider. */
export const ANALYTICS_ENABLED = !import.meta.env.DEV;
