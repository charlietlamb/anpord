const ALGORITHM = { name: "HMAC", hash: "SHA-256" } as const;

/**
 * Better Auth stores the session token in the database but sends it signed, so
 * a seeded row is only usable once the signature is attached the same way the
 * sign-in flow would have attached it.
 */
const signSessionCookie = async (token: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    ALGORITHM,
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    ALGORITHM.name,
    key,
    new TextEncoder().encode(token)
  );

  const encoded = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${token}.${encoded}`;
};

export const sessionCookieHeader = async (token: string, secret: string) =>
  `anpord.session_token=${await signSessionCookie(token, secret)}`;
