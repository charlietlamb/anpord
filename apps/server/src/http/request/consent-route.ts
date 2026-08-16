const AUTHORIZE_PATHS = new Set([
  "/api/auth/mcp/authorize",
  "/api/auth/oauth2/authorize",
]);

export const isAuthorizeRoute = (pathname: string) =>
  AUTHORIZE_PATHS.has(pathname);

export const withConsentPrompt = (request: Request) => {
  const url = new URL(request.url);
  if (url.searchParams.get("prompt") === "consent") {
    return request;
  }
  url.searchParams.set("prompt", "consent");
  return new Request(url, request);
};
