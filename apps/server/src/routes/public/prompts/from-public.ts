import type {
  CreatePromptRequest,
  UpdatePromptRequest,
} from "@anpord/schema/public/requests";

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
