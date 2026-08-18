import type { ApiResponse } from "./http";
import { sessionCookieHeader } from "./session-cookie";
import { AUTH_SECRET } from "./settings";

/**
 * The dashboard's own API, which authenticates with a session rather than a
 * key. A key deliberately cannot reach it, so anything only the dashboard can
 * do is only testable through a seeded session.
 */
export const callInternal = async <Body = unknown>(
  baseUrl: string,
  sessionToken: string,
  method: string,
  path: string,
  payload?: unknown
): Promise<ApiResponse<Body>> => {
  const response = await fetch(`${baseUrl}/api${path}`, {
    body: payload === undefined ? undefined : JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      cookie: await sessionCookieHeader(sessionToken, AUTH_SECRET),
      /** A write from another site driving a signed-in session is what the
       * origin check exists to stop, so anything but a read has to say where
       * it came from. */
      ...(method === "GET" ? {} : { origin: baseUrl }),
    },
    method,
  });

  const text = await response.text();

  return {
    body: (text.length > 0 ? JSON.parse(text) : null) as Body,
    status: response.status,
  };
};
