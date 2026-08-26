import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";

const handler = createStartHandler(defaultStreamHandler);

/* What the handler already answers. Anything else it refuses outright. */
const SERVED = /(^|,)\s*(\*\/\*|text\/html)/;

/**
 * The server entry, wrapped to answer requests that do not ask for HTML.
 *
 * TanStack Start refuses any `Accept` it does not recognise with a 500, so an
 * agent sending `Accept: text/markdown` -- the convention agents use to ask
 * for a readable version of a page -- got a server error rather than the
 * page. Documents are HTML here, so the honest answer is to render the
 * document and let the caller read it, which means asking the handler for
 * HTML on its behalf. A 500 also reads as "this site is broken" rather than
 * "this page is HTML", which is the wrong thing to tell anyone probing it.
 *
 * Routes under /api are untouched: they serve JSON already, and their own
 * handlers run before this one.
 *
 * `Vary: Accept` goes on the way out because the response now depends on the
 * request's `Accept`. Without it a CDN may hand the HTML it cached for one
 * caller to a different one, or the reverse.
 */
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
