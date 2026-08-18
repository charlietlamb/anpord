import type { IdGeneratorShape } from "@anpord/ids/id";
import { type Actor, authorIdOf } from "@anpord/schema/domain/actor";
import type { CreatePromptRequest } from "@anpord/schema/domain/prompts";
import { ChannelName } from "@anpord/schema/domain/prompts";
import { Effect, Option } from "effect";
import { toResolved } from "../domain/views";
import type { ChannelRepositoryShape } from "../repositories/channel-repository";
import type { PromptRepositoryShape } from "../repositories/prompt-repository";
import type { PromptVersionRepositoryShape } from "../repositories/prompt-version-repository";
import type { PromptPublishingShape } from "./prompt-publishing";

interface CreateDependencies {
  readonly channels: ChannelRepositoryShape;
  readonly ids: IdGeneratorShape;
  readonly prompts: PromptRepositoryShape;
  readonly publishing: PromptPublishingShape;
  readonly versions: PromptVersionRepositoryShape;
}

export const createPrompt = (
  deps: CreateDependencies,
  actor: Actor,
  request: CreatePromptRequest
) =>
  Effect.gen(function* () {
    const internalId = yield* deps.ids.generate("prompt");

    yield* deps.prompts.insert({
      authorId: authorIdOf(actor),
      description: request.description ?? null,
      id: request.id,
      internalId,
      name: request.name,
      organizationId: actor.organizationId,
    });

    const version = yield* deps.versions.append({
      authorId: authorIdOf(actor),
      commitMessage: request.commitMessage ?? null,
      config: request.config,
      content: request.content,
      promptId: request.id,
      promptInternalId: internalId,
    });

    /* Published to whichever channel the organisation answers a bare request
       from. The two decisions have to agree: an organisation holding no
       default is answered from its newest version, so publishing a first
       version to a channel nobody reads would only hide it. */
    const fallback = yield* deps.channels.defaultChannel(actor.organizationId);
    const channel = Option.map(fallback, (row) => ChannelName.make(row.name));
    const published = request.publish !== false && Option.isSome(channel);

    if (published && Option.isSome(channel)) {
      yield* deps.publishing.publishVersion({
        actor,
        channel: channel.value,
        promptId: request.id,
        promptInternalId: internalId,
        versionInternalId: version.internalId,
      });
    }

    return yield* toResolved(
      request,
      published ? Option.getOrNull(channel) : null,
      version
    );
  });
