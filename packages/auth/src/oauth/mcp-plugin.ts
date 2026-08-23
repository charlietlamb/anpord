import { MCP_SCOPES, SUPPORTED_SCOPES } from "@anpord/schema/domain/scopes";
import { mcp } from "better-auth/plugins";

const LOGIN_PAGE = "/login";

export const mcpPlugin = (resource: string) => {
  const metadata = { scopes_supported: [...SUPPORTED_SCOPES] };
  const options = {
    loginPage: LOGIN_PAGE,
    metadata,
    oidcConfig: {
      allowDynamicClientRegistration: true,
      consentPage: "/oauth/consent",
      defaultScope: MCP_SCOPES.join(" "),
      loginPage: LOGIN_PAGE,
      metadata,
      requirePKCE: true,
      scopes: [...MCP_SCOPES],
    },
    resource,
  };

  return mcp(options);
};
