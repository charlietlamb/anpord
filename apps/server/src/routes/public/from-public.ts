import type {
  CreatePromptRequest,
  UpdatePromptRequest,
} from "@anpord/schema/public/requests";

/**
 * The inbound half of the public boundary. Public callers say `message`; the
 * domain calls it a commit message, and that rename should live beside its
 * outbound counterpart rather than inside a handler.
 */
export const fromPublicCreate = (payload: typeof CreatePromptRequest.Type) => ({
  commitMessage: payload.message,
  config: payload.config,
  content: payload.content,
  description: payload.description,
  id: payload.id,
  name: payload.name,
});

export const fromPublicUpdate = (payload: typeof UpdatePromptRequest.Type) => ({
  commitMessage: payload.message,
  config: payload.config,
  content: payload.content,
});
