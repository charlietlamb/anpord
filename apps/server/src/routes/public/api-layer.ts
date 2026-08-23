import { PublicApi } from "@anpord/schema/public/api";
import { Layer } from "effect";
import { ApiKeyAuthenticationLive } from "../../http/authentication/api-key-authentication";
import { apiSurface } from "../api-surface";
import { PublicEvalsHandlers } from "./evals/handlers";
import { PublicPromptsHandlers } from "./prompts/handlers";

export const PublicApiLive = apiSurface(
  PublicApi,
  PublicPromptsHandlers.pipe(Layer.merge(PublicEvalsHandlers)),
  ApiKeyAuthenticationLive
);
