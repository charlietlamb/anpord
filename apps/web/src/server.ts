import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";

const handler = createStartHandler(defaultStreamHandler);

const SERVED = /(^|,)\s*(\*\/\*|text\/html)/;

/* TanStack Start answers any `Accept` it does not recognise with a 500, so unknown types are re-asked as HTML. */
/* `Vary: Accept` because the response now varies by the request's `Accept`. */
export default {
  async fetch(request: Request, ...rest: unknown[]) {
    const accept = request.headers.get("accept") ?? "*/*";

    if (SERVED.test(accept)) {
      return await handler(request, ...(rest as []));
    }

    const headers = new Headers(request.headers);
    headers.set("accept", "text/html");

    const response = await handler(
      new Request(request.url, {
        body: request.body,
        headers,
        method: request.method,
        redirect: request.redirect,
        signal: request.signal,
        ...(request.body === null ? {} : { duplex: "half" }),
      } as RequestInit),
      ...(rest as [])
    );
    const withVary = new Headers(response.headers);
    withVary.set("vary", appendAccept(withVary.get("vary")));

    return new Response(response.body, {
      headers: withVary,
      status: response.status,
      statusText: response.statusText,
    });
  },
};

const appendAccept = (existing: string | null) => {
  if (existing === null || existing.trim() === "") {
    return "Accept";
  }

  const parts = existing.split(",").map((part) => part.trim());

  return parts.some((part) => part.toLowerCase() === "accept")
    ? existing
    : `${existing}, Accept`;
};
