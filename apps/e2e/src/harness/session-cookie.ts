import { signSessionCookie } from "@anpord/auth/session/sign-session-cookie";
import { SESSION_COOKIE } from "@anpord/schema/internal/authentication";

export const sessionCookieHeader = async (token: string, secret: string) =>
  `${SESSION_COOKIE}=${await signSessionCookie(token, secret)}`;
