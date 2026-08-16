import { mcp } from "better-auth/plugins";

const LOGIN_PAGE = "/login";

export const mcpPlugin = (resource: string) =>
  mcp({
    loginPage: LOGIN_PAGE,
    oidcConfig: {
      allowDynamicClientRegistration: true,
      consentPage: "/oauth/consent",
      loginPage: LOGIN_PAGE,
      scopes: ["prompts:read", "prompts:write"],
    },
    resource,
  });
