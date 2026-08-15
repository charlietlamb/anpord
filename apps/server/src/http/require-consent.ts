const AUTHORIZE_PATHS = new Set([
  "/api/auth/mcp/authorize",
  "/api/auth/oauth2/authorize",
]);

export const isAuthorizeRoute = (pathname: string) =>
  AUTHORIZE_PATHS.has(pathname);

/**
 * The MCP authorize handler only shows the consent screen when the client asks
 * for it with prompt=consent, so a client that omits it is handed a code
 * silently. Consent is the user's decision rather than the client's, so the
 * parameter is set here instead of being trusted from the request.
 */
export const withConsentPrompt = (request: Request) => {
  const url = new URL(request.url);
  if (url.searchParams.get("prompt") === "consent") {
    return request;
  }
  url.searchParams.set("prompt", "consent");
  return new Request(url, request);
};
