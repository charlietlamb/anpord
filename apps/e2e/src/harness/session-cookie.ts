import { signSessionCookie } from "@sphynx/auth/session/sign-session-cookie";
import { SESSION_COOKIE } from "@sphynx/schema/internal/authentication";

export const sessionCookieHeader = async (token: string, secret: string) =>
  `${SESSION_COOKIE}=${await signSessionCookie(token, secret)}`;
