import { AnpordApi } from "@anpord/schema/internal/api";
import { Layer } from "effect";
import { AuthenticationLive } from "../../http/authentication/session-authentication";
import { apiSurface } from "../api-surface";
import { ActivityHandlers } from "./activity/handlers";
import { ChannelsHandlers } from "./channels/handlers";
import { CredentialsHandlers } from "./credentials/handlers";
import { EvalsHandlers } from "./evals/handlers";
import { HealthHandlers } from "./health/handlers";
import { OAuthHandlers } from "./oauth/handlers";
import { PromptsHandlers } from "./prompts/handlers";

const GroupsLive = Layer.mergeAll(
  HealthHandlers,
  OAuthHandlers,
  PromptsHandlers,
  ChannelsHandlers,
  ActivityHandlers,
  CredentialsHandlers,
  EvalsHandlers
);

export const ApiLive = apiSurface(AnpordApi, GroupsLive, AuthenticationLive);
