import { API_ORIGIN, API_REFERENCE_URL } from "@sphynx/schema/public/origins";
import { createFileRoute } from "@tanstack/react-router";

const notFound = ({ request }: { request: Request }) =>
  Response.json(
    {
      _tag: "NotFound",
      documentation: API_REFERENCE_URL,
      message: `No API route matches ${new URL(request.url).pathname}. The public API is served from ${API_ORIGIN}/v1.`,
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
