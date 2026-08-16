import { MCPServer } from "mcp-use";
import { anpordOAuth } from "./oauth";
import type { AnpordUser } from "./tools";
import { register } from "./tools";

const server = new MCPServer<AnpordUser>({
  description: "Read and version the prompts behind your product.",
  name: "anpord",
  oauth: anpordOAuth,
  version: "0.1.0",
});

register(server);

export default server;
