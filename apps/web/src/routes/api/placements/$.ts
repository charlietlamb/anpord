import { createFileRoute } from "@tanstack/react-router";
import { proxyToServer } from "@/lib/server/proxy";

/** Forwards to the API server so browser requests carry the session cookie. */
export const Route = createFileRoute("/api/placements/$")({
  server: {
    handlers: {
      GET: proxyToServer,
      POST: proxyToServer,
    },
  },
});
