const AUTH_BASE = "/api/auth";

const DISCOVERY = new Set([
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
  "/.well-known/openid-configuration",
]);

export const isDiscoveryRoute = (pathname: string) => DISCOVERY.has(pathname);

/**
 * The specification puts discovery at the root, while Better Auth serves it
 * under its own base path. Rewriting keeps one implementation rather than a
 * second copy of the document that could drift.
 */
export const toAuthRequest = (request: Request) => {
  const url = new URL(request.url);
  url.pathname = `${AUTH_BASE}${url.pathname}`;
  return new Request(url, request);
};
