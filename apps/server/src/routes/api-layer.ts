import { AnpordApi } from "@anpord/schema/api";
import { Layer } from "effect";
import { AuthenticationLive } from "../http/authentication";
import { apiSurface } from "./api-surface";
import { HealthHandlers } from "./health-handlers";
import { OAuthHandlers } from "./oauth-handlers";
import { PromptsHandlers } from "./prompts-handlers";

const GroupsLive = Layer.mergeAll(
  HealthHandlers,
  OAuthHandlers,
  PromptsHandlers
);

export const ApiLive = apiSurface(AnpordApi, GroupsLive, AuthenticationLive);
