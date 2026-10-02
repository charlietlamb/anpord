import { MCPServer } from "mcp-use";
import { sphynxOAuth } from "./oauth";
import type { SphynxUser } from "./sphynx-user";
import { register, serverDescription } from "./tools";

const server = new MCPServer<SphynxUser>({
  description: serverDescription(),
  name: "sphynx",
  oauth: sphynxOAuth,
  version: "0.2.0",
});

register(server);

export default server;
