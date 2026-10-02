import { PROMPTS_ENABLED } from "@sphynx/schema/domain/features";
import type { MCPServer } from "mcp-use";
import { registerEvalTools } from "./eval-tools";
import { registerPromptTools } from "./prompt-tools";
import type { SphynxUser } from "./sphynx-user";

export const serverDescription = (prompts = PROMPTS_ENABLED) =>
  prompts
    ? "Run coding agent evals and manage versioned prompts."
    : "Run coding agent evals.";

export const register = (
  server: MCPServer<SphynxUser>,
  prompts = PROMPTS_ENABLED
) => {
  registerEvalTools(server);
  if (prompts) {
    registerPromptTools(server);
  }
};
