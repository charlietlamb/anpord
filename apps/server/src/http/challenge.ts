/**
 * RFC 9728 section 5.1: a 401 from a protected resource points at its metadata
 * so a client can find the authorization server without being told out of band.
 * The specification makes this a MUST for MCP servers.
 */
export const withAuthenticateChallenge = (
  response: Response,
  origin: string
) => {
  if (response.status !== 401 || response.headers.has("www-authenticate")) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set(
    "www-authenticate",
    `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`
  );

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};
