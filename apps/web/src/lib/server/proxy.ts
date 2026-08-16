import { serverUrl } from "./server-url";

/** GET and HEAD carry no body, so reading one would throw. */
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

export function proxyToServer({ request }: { request: Request }) {
  return forward(request, new URL(request.url).pathname);
}

const AUTH_BASE = "/api/auth";

/**
 * Better Auth serves its metadata under /api/auth, but clients look for it
 * where RFC 8414 says it lives. An issuer without a path puts the well-known
 * segment at the root; one with a path — which is how the MCP server names this
 * server — puts the segment before the path, as /.well-known/<doc>/api/auth.
 * Both forms are answered so either resolution strategy finds the document.
 */
export function proxyDiscoveryToServer({ request }: { request: Request }) {
  const { pathname } = new URL(request.url);
  const document = pathname.endsWith(AUTH_BASE)
    ? pathname.slice(0, -AUTH_BASE.length)
    : pathname;
  return forward(request, `${AUTH_BASE}${document}`);
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
