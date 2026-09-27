import { SESSION_COOKIE } from "@anpord/schema/internal/authentication";

export const SESSION_COOKIE_NAMES = [
  SESSION_COOKIE,
  `__Secure-${SESSION_COOKIE}`,
] as const;
