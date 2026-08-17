/// <reference types="vite/client" />
import "@fontsource-variable/funnel-display";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import headingFont from "@fontsource-variable/funnel-display/files/funnel-display-latin-wght-normal.woff2?url";
import bodyFont from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { RootDocument } from "@/components/layout/root-document";
import { RootErrorComponent } from "@/components/layout/root-error";
import { RootNotFound } from "@/components/layout/root-not-found";
import "../styles/globals.css";

/** Orange while developing, so a local tab is never mistaken for production. */
const FAVICON = import.meta.env.DEV ? "/favicon-dev.svg" : "/favicon.svg";

const TITLE = "Anpord";
const DESCRIPTION = "Write, version, and ship the prompts behind your product.";

/** A crawler resolves nothing, so the card image has to be absolute. */
const SITE_URL = "https://www.anpord.com";
const OG_IMAGE = `${SITE_URL}/og.png`;

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },

      { property: "og:type", content: "website" },
      { property: "og:site_name", content: TITLE },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: DESCRIPTION },

      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: FAVICON },
      /** The stylesheet is what discovers these, so without a preload they
       * start a request behind it and the first text paints unstyled. */
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: bodyFont,
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: headingFont,
        crossOrigin: "anonymous",
      },
    ],
  }),
  component: RootComponent,
  errorComponent: RootErrorComponent,
  notFoundComponent: RootNotFound,
});

function RootComponent() {
  return (
    <RootDocument>
      <NuqsAdapter>
        <Outlet />
      </NuqsAdapter>
    </RootDocument>
  );
}
