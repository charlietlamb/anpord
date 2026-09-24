import { PROMPTS_ENABLED } from "@anpord/schema/domain/features";
import type { MCPServer } from "mcp-use";
import type { AnpordUser } from "./anpord-user";
import { registerEvalTools } from "./eval-tools";
import { registerPromptTools } from "./prompt-tools";

export const serverDescription = (prompts = PROMPTS_ENABLED) =>
  prompts
    ? "Run coding agent evals and manage versioned prompts."
    : "Run coding agent evals.";

export const register = (
  server: MCPServer<AnpordUser>,
  prompts = PROMPTS_ENABLED
) => {
  registerEvalTools(server);
  if (prompts) {
    registerPromptTools(server);
  }
};
