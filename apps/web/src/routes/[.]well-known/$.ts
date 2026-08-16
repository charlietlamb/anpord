import { createFileRoute } from "@tanstack/react-router";
import { proxyDiscoveryToServer } from "@/lib/server/proxy";

export const Route = createFileRoute("/.well-known/$")({
  server: { handlers: { GET: proxyDiscoveryToServer } },
});
