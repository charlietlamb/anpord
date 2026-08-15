import type { IdGeneratorShape } from "@anpord/ids/id";
import type { Actor } from "@anpord/schema/actor";
import type { CreatePromptRequest } from "@anpord/schema/prompts";
import { PRODUCTION } from "@anpord/schema/prompts";
import { Effect } from "effect";
import { toResolved } from "../domain/views";
import type { PromptRepositoryShape } from "../repositories/prompt-repository";
import type { PromptVersionRepositoryShape } from "../repositories/prompt-version-repository";
import type { PromptPublishingShape } from "./prompt-publishing";

interface CreateDependencies {
  readonly ids: IdGeneratorShape;
  readonly prompts: PromptRepositoryShape;
  readonly publishing: PromptPublishingShape;
  readonly versions: PromptVersionRepositoryShape;
}

/**
 * Three writes in order — prompt, first version, then the production pointer —
 * so it lives apart from the single-statement catalog operations.
 */
export const createPrompt = (
  deps: CreateDependencies,
  actor: Actor,
  request: CreatePromptRequest
) =>
  Effect.gen(function* () {
    const internalId = yield* deps.ids.generate("prompt");

    yield* deps.prompts.insert({
      actorId: actor.id,
      description: request.description ?? null,
      id: request.id,
      internalId,
      name: request.name,
      organizationId: actor.organizationId,
    });

    const version = yield* deps.versions.append({
      actorId: actor.id,
      commitMessage: request.commitMessage ?? null,
      config: request.config,
      content: request.content,
      promptId: request.id,
      promptInternalId: internalId,
    });

    const published = request.publish !== false;

    if (published) {
      yield* deps.publishing.publishVersion({
        actor,
        channel: PRODUCTION,
        promptId: request.id,
        promptInternalId: internalId,
        versionInternalId: version.internalId,
      });
    }

    return yield* toResolved(request, published ? PRODUCTION : null, version);
  });
