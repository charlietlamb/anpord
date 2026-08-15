import { serverUrl } from "./server-url";

/** GET and HEAD carry no body, so reading one would throw. */
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

/**
 * Buffers the body instead of forwarding the stream. A streamed body has to be
 * non-null and unread at the moment fetch takes it, which does not hold once
 * the framework has touched the request — undici then fails the whole call with
 * "expected non-null body source". Prompts are small, so the copy is cheap.
 */
export async function proxyToServer({ request }: { request: Request }) {
  const baseUrl = serverUrl();
  if (!baseUrl) {
    return new Response(
      "AUTH_SERVER_URL or BETTER_AUTH_URL is not configured",
      { status: 500 }
    );
  }

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, baseUrl);
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
