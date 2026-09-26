const INTERNAL_BASE = "/api";

export const isInternalRoute = (pathname: string) =>
  pathname === INTERNAL_BASE || pathname.startsWith(`${INTERNAL_BASE}/`);
