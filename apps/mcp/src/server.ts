import { MCPServer } from "mcp-use";
import { anpordOAuth } from "./oauth";
import type { AnpordUser } from "./tools";
import { register } from "./tools";

const server = new MCPServer<AnpordUser>({
  description: "Run coding agent evals and manage versioned prompts.",
  name: "anpord",
  oauth: anpordOAuth,
  version: "0.2.0",
});

register(server);

export default server;
