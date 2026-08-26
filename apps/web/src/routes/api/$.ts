import { createFileRoute } from "@tanstack/react-router";
import { DOCS_URL } from "@/lib/urls";

/**
 * The answer for an /api path nothing else claimed.
 *
 * Without it the router falls through to the SSR handler and returns the app
 * shell: a caller that asked for JSON gets a document, and an agent reading
 * the status alone concludes the endpoint exists. The routes above this one
 * are proxies to the API server, so anything reaching here is a path this
 * origin genuinely does not serve, and it should say so in the shape the
 * caller was already expecting.
 */
const notFound = ({ request }: { request: Request }) =>
  Response.json(
    {
      _tag: "NotFound",
      documentation: `${DOCS_URL}/api-reference/introduction`,
      message: `No API route matches ${new URL(request.url).pathname}. The public API is served from https://api.anpord.com/v1.`,
    },
    { status: 404 }
  );

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      DELETE: notFound,
      GET: notFound,
      PATCH: notFound,
      POST: notFound,
      PUT: notFound,
    },
  },
});
