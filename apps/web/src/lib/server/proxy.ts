import { serverUrl } from "./server-url";

/** GET and HEAD carry no body, so reading one would throw. */
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

export function proxyToServer({ request }: { request: Request }) {
  return forward(request, new URL(request.url).pathname);
}

/**
 * The metadata names https://www.anpord.com as the issuer, so RFC 8414 clients
 * look for it here rather than under /api/auth. Better Auth serves it one level
 * down, so the root path is rewritten onto the auth base the way the API server
 * already does for its own origin.
 */
export function proxyDiscoveryToServer({ request }: { request: Request }) {
  const { pathname } = new URL(request.url);
  return forward(request, `/api/auth${pathname}`);
}

/**
 * Buffers the body instead of forwarding the stream. A streamed body has to be
 * non-null and unread at the moment fetch takes it, which does not hold once
 * the framework has touched the request — undici then fails the whole call with
 * "expected non-null body source". Prompts are small, so the copy is cheap.
 */
async function forward(request: Request, pathname: string) {
  const baseUrl = serverUrl();
  if (!baseUrl) {
    return new Response(
      "AUTH_SERVER_URL or BETTER_AUTH_URL is not configured",
      { status: 500 }
    );
  }

  const incoming = new URL(request.url);
  const target = new URL(pathname + incoming.search, baseUrl);
  const headers = new Headers(request.headers);
  headers.set("accept-encoding", "identity");

  const body = METHODS_WITHOUT_BODY.has(request.method.toUpperCase())
    ? undefined
    : await request.arrayBuffer();

  return fetch(target, {
    headers,
    method: request.method,
    redirect: "manual",
    ...(body && body.byteLength > 0 ? { body } : {}),
  });
}
