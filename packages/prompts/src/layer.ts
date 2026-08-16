import { IdGeneratorLive } from "@anpord/ids/layer";
import { Layer } from "effect";
import { ChannelRepositoryLive } from "./repositories/channel-repository";
import { PromptChannelRepositoryLive } from "./repositories/prompt-channel-repository";
import { PromptRepositoryLive } from "./repositories/prompt-repository";
import { PromptVersionRepositoryLive } from "./repositories/prompt-version-repository";
import { ChannelCatalogLive } from "./services/channel-catalog";
import { PromptAuthoringLive } from "./services/prompt-authoring";
import { PromptCacheLive } from "./services/prompt-cache";
import { PromptCatalogLive } from "./services/prompt-catalog";
import { PromptPublishingLive } from "./services/prompt-publishing";
import { PromptResolutionLive } from "./services/prompt-resolution";

const RepositoriesLive = Layer.mergeAll(
  PromptRepositoryLive,
  PromptVersionRepositoryLive,
  PromptChannelRepositoryLive,
  ChannelRepositoryLive
).pipe(Layer.provide(IdGeneratorLive));

const PublishingLive = PromptPublishingLive.pipe(
  Layer.provide(Layer.mergeAll(RepositoriesLive, PromptCacheLive))
);

const InternalsLive = Layer.mergeAll(
  RepositoriesLive,
  PromptCacheLive,
  PublishingLive
);

export const PromptsLayer = Layer.mergeAll(
  PromptCatalogLive,
  PromptAuthoringLive,
  PromptResolutionLive,
  PublishingLive,
  ChannelCatalogLive
).pipe(Layer.provide(InternalsLive), Layer.provide(IdGeneratorLive));
