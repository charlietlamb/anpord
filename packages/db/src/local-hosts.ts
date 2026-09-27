export const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "0.0.0.0",
]);

export const isLocalHost = (hostname: string) =>
  LOCAL_HOSTS.has(hostname.toLowerCase());
