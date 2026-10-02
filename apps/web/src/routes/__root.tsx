/// <reference types="vite/client" />
import { WEB_ORIGIN } from "@sphynx/schema/public/origins";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { RootDocument } from "@/components/layout/root-document";
import { RootErrorComponent } from "@/components/layout/root-error";
import { RootNotFound } from "@/components/layout/root-not-found";
import { FONT_PRELOADS } from "@/lib/fonts";
import "../styles/globals.css";
import devCss from "../styles/globals.css?url";

const FAVICON = import.meta.env.DEV ? "/favicon-dev.svg" : "/favicon.svg";

const TITLE = "Sphynx";
const DESCRIPTION =
  "Evals for Claude Code and Codex. Hand a coding agent a repo and a real shell, then score what it built.";

const OG_IMAGE = `${WEB_ORIGIN}/og.png?v=wordmark`;

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
      { property: "og:url", content: WEB_ORIGIN },
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
      ...(import.meta.env.DEV ? [{ rel: "stylesheet", href: devCss }] : []),
      { rel: "expect", href: "#$tsr-stream-barrier", blocking: "render" },
      { rel: "icon", type: "image/svg+xml", href: FAVICON },
      ...FONT_PRELOADS,
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
