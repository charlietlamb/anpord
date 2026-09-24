import { serverUrl } from "./server-url";

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

export function proxyToServer({ request }: { request: Request }) {
  return forward(request, new URL(request.url).pathname);
}

const AUTH_BASE = "/api/auth";

export function proxyDiscoveryToServer({ request }: { request: Request }) {
  const { pathname } = new URL(request.url);
  const document = pathname.endsWith(AUTH_BASE)
    ? pathname.slice(0, -AUTH_BASE.length)
    : pathname;
  return forward(request, `${AUTH_BASE}${document}`);
}

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
