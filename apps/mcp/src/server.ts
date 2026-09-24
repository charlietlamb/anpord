import { MCPServer } from "mcp-use";
import type { AnpordUser } from "./anpord-user";
import { anpordOAuth } from "./oauth";
import { register, serverDescription } from "./tools";

const server = new MCPServer<AnpordUser>({
  description: serverDescription(),
  name: "anpord",
  oauth: anpordOAuth,
  version: "0.2.0",
});

register(server);

export default server;
