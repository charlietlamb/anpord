import { PublicApi } from "@anpord/schema/public/api";
import { ApiKeyAuthenticationLive } from "../../http/api-key-authentication";
import { apiSurface } from "../api-surface";
import { PublicPromptsHandlers } from "./prompts-handlers";

export const PublicApiLive = apiSurface(
  PublicApi,
  PublicPromptsHandlers,
  ApiKeyAuthenticationLive
);
