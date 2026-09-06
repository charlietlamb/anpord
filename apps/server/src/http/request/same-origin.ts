const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/* CSRF defence: the browser attaches the session cookie to cross-site writes, and `Origin` is browser-set and unforgeable from a page. */
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
