import { createFileRoute } from "@tanstack/react-router";
import { DOCS_URL } from "@/lib/urls";

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
