/** A read cannot change anything, so it needs no origin, and CORS already stops
 * another site reading the response. */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * The session travels in a cookie, which the browser attaches to a request that
 * another site made. Without this, any page a signed-in person visits can
 * archive their prompts by asking for it — the response is unreadable to the
 * attacker, but the write still lands.
 *
 * `Origin` is set by the browser and cannot be forged from a page, so trusting
 * it is what distinguishes our own dashboard from somebody else's.
 */
export const isSameOrigin = (
  request: Request,
  trusted: readonly string[]
): boolean => {
  if (SAFE_METHODS.has(request.method)) {
    return true;
  }

  const origin = request.headers.get("origin");

  if (origin === null) {
    return request.headers.get("cookie") === null;
  }

  return trusted.includes(origin);
};
