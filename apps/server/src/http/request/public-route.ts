const PUBLIC_BASE = "/v1";

export const isPublicRoute = (pathname: string) =>
  pathname.startsWith(`${PUBLIC_BASE}/`);
