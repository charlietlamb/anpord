/** The authorization server grants these and the resource server advertises
 * them, so they are declared once rather than kept in step by hand. The OIDC
 * scopes come with the identity token every client receives. */
export const OIDC_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
] as const;

export const PROMPT_SCOPES = ["prompts:read", "prompts:write"] as const;

export const SUPPORTED_SCOPES = [...OIDC_SCOPES, ...PROMPT_SCOPES];
