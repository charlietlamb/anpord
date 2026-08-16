/// <reference types="vite/client" />
import "@fontsource-variable/funnel-display";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { RootDocument } from "@/components/layout/root-document";
import { RootErrorComponent } from "@/components/layout/root-error";
import { RootNotFound } from "@/components/layout/root-not-found";
import "../styles/globals.css";

/** Orange while developing, so a local tab is never mistaken for production. */
const FAVICON = import.meta.env.DEV ? "/favicon-dev.svg" : "/favicon.svg";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Anpord" },
      {
        name: "description",
        content: "Write, version, and ship the prompts behind your product.",
      },
    ],
    links: [{ rel: "icon", type: "image/svg+xml", href: FAVICON }],
  }),
  component: RootComponent,
  errorComponent: RootErrorComponent,
  notFoundComponent: RootNotFound,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}
