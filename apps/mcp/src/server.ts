import { MCPServer } from "mcp-use";
import { register } from "./tools";

const server = new MCPServer({
  description: "Read and version the prompts behind your product.",
  name: "anpord",
  version: "0.1.0",
});

register(server);

export default server;
