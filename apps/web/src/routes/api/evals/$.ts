import { createFileRoute } from "@tanstack/react-router";
import { proxyToServer } from "@/lib/server/proxy";

/** Forwards to the API server so browser requests carry the session cookie. */
export const Route = createFileRoute("/api/evals/$")({
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
