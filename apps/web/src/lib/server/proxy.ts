import { serverUrl } from "./server-url";

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

  return fetch(target, {
    body: request.body,
    headers,
    method: request.method,
    redirect: "manual",
    // @ts-expect-error Node requires duplex for streamed request bodies.
    duplex: "half",
  });
}
