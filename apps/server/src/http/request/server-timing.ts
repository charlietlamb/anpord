const HEADER = "server-timing";

/**
 * How long the server itself took, so a slow call can be told apart from a
 * slow network without access to the traces.
 */
export const withServerTiming = async (
  respond: () => Promise<Response>
): Promise<Response> => {
  const started = performance.now();
  const response = await respond();
  const elapsed = Math.round((performance.now() - started) * 100) / 100;

  const headers = new Headers(response.headers);
  headers.set(HEADER, `app;dur=${elapsed}`);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};
