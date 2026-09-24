import { createFileRoute } from "@tanstack/react-router";
import { proxyToServer } from "@/lib/server/proxy";

export const Route = createFileRoute("/api/channels/$")({
  server: {
    handlers: {
      DELETE: proxyToServer,
      GET: proxyToServer,
      PATCH: proxyToServer,
      POST: proxyToServer,
      PUT: proxyToServer,
    },
  },
});
