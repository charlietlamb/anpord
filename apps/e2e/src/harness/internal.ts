import type { ApiResponse } from "./http";
import { sessionCookieHeader } from "./session-cookie";
import { AUTH_SECRET } from "./settings";

/* The dashboard's own API: a key deliberately cannot reach it, so it is only testable through a seeded session. */
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
      /* The origin check rejects any write that does not say where it came from. */
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
