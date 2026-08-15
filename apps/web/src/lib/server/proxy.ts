import { serverUrl } from "./server-url";

/** GET and HEAD carry no body; passing a null stream fails the fetch outright. */
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

export function proxyToServer({ request }: { request: Request }) {
  const baseUrl = serverUrl();
  if (!baseUrl) {
    return new Response(
      "AUTH_SERVER_URL or BETTER_AUTH_URL is not configured",
      {
        status: 500,
      }
    );
  }

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, baseUrl);
  const headers = new Headers(request.headers);
  headers.set("accept-encoding", "identity");

  const hasBody =
    !METHODS_WITHOUT_BODY.has(request.method.toUpperCase()) && request.body;

  return fetch(target, {
    headers,
    method: request.method,
    redirect: "manual",
    // Node requires duplex when streaming a request body.
    ...(hasBody ? { body: request.body, duplex: "half" } : {}),
  });
}
