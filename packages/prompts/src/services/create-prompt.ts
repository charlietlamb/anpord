import type { IdGeneratorShape } from "@anpord/ids/id";
import { type Actor, authorIdOf } from "@anpord/schema/domain/actor";
import type { CreatePromptRequest } from "@anpord/schema/domain/prompts";
import { ChannelName, PRODUCTION } from "@anpord/schema/domain/prompts";
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
       from, and to production when it has not chosen one. The two decisions
       have to agree: resolution falls back to production, so publishing
       somewhere else would leave a new prompt that cannot be read without
       naming a channel. */
    const fallback = yield* deps.channels.defaultChannel(actor.organizationId);
    const channel = Option.match(fallback, {
      onNone: () => PRODUCTION,
      onSome: (row) => ChannelName.make(row.name),
    });
    const published = request.publish !== false;

    if (published) {
      yield* deps.publishing.publishVersion({
        actor,
        channel,
        promptId: request.id,
        promptInternalId: internalId,
        versionInternalId: version.internalId,
      });
    }

    return yield* toResolved(request, published ? channel : null, version);
  });
