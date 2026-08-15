import { IdGeneratorLive } from "@anpord/ids/layer";
import { Layer } from "effect";
import { PromptChannelRepositoryLive } from "./repositories/prompt-channel-repository";
import { PromptRepositoryLive } from "./repositories/prompt-repository";
import { PromptVersionRepositoryLive } from "./repositories/prompt-version-repository";
import { PromptAuthoringLive } from "./services/prompt-authoring";
import { PromptCatalogLive } from "./services/prompt-catalog";
import { PromptPublishingLive } from "./services/prompt-publishing";
import { PromptResolutionLive } from "./services/prompt-resolution";

const RepositoriesLive = Layer.mergeAll(
  PromptRepositoryLive,
  PromptVersionRepositoryLive,
  PromptChannelRepositoryLive
).pipe(Layer.provide(IdGeneratorLive));

/** Authoring and catalog both publish, so publishing sits beneath them. */
const InternalsLive = Layer.mergeAll(
  RepositoriesLive,
  PromptPublishingLive.pipe(Layer.provide(RepositoriesLive))
);

/**
 * Callers provide Database + Cache; repositories, publishing and id generation
 * are implementation details and stay out of the caller's requirements.
 */
export const PromptsLayer = Layer.mergeAll(
  PromptCatalogLive,
  PromptAuthoringLive,
  PromptResolutionLive,
  PromptPublishingLive
).pipe(Layer.provide(InternalsLive), Layer.provide(IdGeneratorLive));
