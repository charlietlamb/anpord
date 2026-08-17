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
      requirePKCE: true,
      scopes: [...PROMPT_SCOPES],
    },
    resource,
  });
