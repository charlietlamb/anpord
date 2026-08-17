import { PROMPT_SCOPES } from "@anpord/schema/domain/scopes";
import { mcp } from "better-auth/plugins";

const LOGIN_PAGE = "/login";

export const mcpPlugin = (resource: string) =>
  mcp({
    loginPage: LOGIN_PAGE,
    oidcConfig: {
      allowDynamicClientRegistration: true,
      consentPage: "/oauth/consent",
      loginPage: LOGIN_PAGE,
      /** Anyone may register a client, so an authorization code has to be
       * useless to whoever intercepts it. Without this the verifier is checked
       * only when a client volunteers one, which an attacker's client will not
       * do. */
      requirePKCE: true,
      scopes: [...PROMPT_SCOPES],
    },
    resource,
  });
