import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/dev/logos")({
  component: import.meta.env.DEV
    ? lazyRouteComponent(
        () => import("@/components/dev/logo-gallery"),
        "LogosPage"
      )
    : undefined,
});
