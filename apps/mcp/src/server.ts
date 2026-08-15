import { MCPServer } from "mcp-use";
import { oauthBetterAuthProvider } from "mcp-use/oauth/better-auth";
import { authUrl as authURL } from "./config";
import type { AnpordUser } from "./tools";
import { register } from "./tools";

const oauth = oauthBetterAuthProvider({ authURL });

const server = new MCPServer<AnpordUser>({
  description: "Read and version the prompts behind your product.",
  name: "anpord",
  oauth,
  version: "0.1.0",
});

register(server);

export default server;
