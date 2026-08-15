import { MCPServer } from "mcp-use";
import { oauthBetterAuthProvider } from "mcp-use/oauth/better-auth";
import type { AnpordUser } from "./tools";
import { register } from "./tools";

const oauth = oauthBetterAuthProvider({
  authURL: process.env.ANPORD_AUTH_URL ?? "https://www.anpord.com/api/auth",
});

const server = new MCPServer<AnpordUser>({
  description: "Read and version the prompts behind your product.",
  name: "anpord",
  oauth,
  version: "0.1.0",
});

register(server);

export default server;
