export const COOKIE_PREFIX = "anpord";

const SESSION_TOKEN = `${COOKIE_PREFIX}.session_token`;

export const SESSION_COOKIE_NAMES = [
  SESSION_TOKEN,
  `__Secure-${SESSION_TOKEN}`,
] as const;
