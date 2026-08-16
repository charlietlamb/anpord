const AUTH_BASE = "/api/auth";

export const isAuthRoute = (pathname: string) =>
  pathname === AUTH_BASE || pathname.startsWith(`${AUTH_BASE}/`);
