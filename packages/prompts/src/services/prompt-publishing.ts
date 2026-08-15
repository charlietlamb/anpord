import { Cache } from "@anpord/cache/cache";
import type { Actor } from "@anpord/schema/actor";
import type {
  ChannelName,
  PromptId,
  SetChannelRequest,
} from "@anpord/schema/prompts";
import { Clock, Context, Effect, Layer, Option } from "effect";
import type { PromptError } from "../domain/errors";
import { VersionNotFound } from "../domain/errors";
import { promptPrefix } from "../domain/keys";
import { PromptChannelRepository } from "../repositories/prompt-channel-repository";
import { PromptRepository } from "../repositories/prompt-repository";
import { PromptVersionRepository } from "../repositories/prompt-version-repository";
import { requirePrompt } from "./require-prompt";

export interface PromptPublishingShape {
  /** Used by authoring and catalog to publish a version they just wrote. */
  readonly publishVersion: (input: {
    readonly actor: Actor;
    readonly channel: ChannelName;
    readonly promptId: PromptId;
    readonly promptInternalId: string;
    readonly versionInternalId: string;
  }) => Effect.Effect<void, PromptError>;
  readonly setChannel: (
    actor: Actor,
    id: PromptId,
    request: SetChannelRequest
  ) => Effect.Effect<void, PromptError>;
}

export class PromptPublishing extends Context.Tag(
  "@anpord/prompts/PromptPublishing"
)<PromptPublishing, PromptPublishingShape>() {}

export const PromptPublishingLive = Layer.effect(
  PromptPublishing,
  Effect.gen(function* () {
    const prompts = yield* PromptRepository;
    const versions = yield* PromptVersionRepository;
    const channels = yield* PromptChannelRepository;
    const cache = yield* Cache;

    const publishVersion: PromptPublishingShape["publishVersion"] = (input) =>
      Effect.gen(function* () {
        const movedAt = new Date(yield* Clock.currentTimeMillis);

        yield* channels.move({
          actorId: input.actor.id,
          channel: input.channel,
          movedAt,
          promptInternalId: input.promptInternalId,
          versionInternalId: input.versionInternalId,
        });

        yield* cache.invalidatePrefix(
          promptPrefix(input.actor.organizationId, input.promptId)
        );

        yield* Effect.logInfo("prompt channel moved").pipe(
          Effect.annotateLogs({
            channel: input.channel,
            promptInternalId: input.promptInternalId,
            versionInternalId: input.versionInternalId,
          })
        );
      });

    return {
      publishVersion,

      setChannel: (actor, id, request) =>
        Effect.gen(function* () {
          const row = yield* requirePrompt(prompts, actor, id);
          const found = yield* versions.byNumber(
            row.internalId,
            request.version
          );

          const target = yield* Option.match(found, {
            onNone: () =>
              Effect.fail(
                new VersionNotFound({ promptId: id, version: request.version })
              ),
            onSome: Effect.succeed,
          });

          yield* publishVersion({
            actor,
            channel: request.channel,
            promptId: id,
            promptInternalId: row.internalId,
            versionInternalId: target.internalId,
          });
        }).pipe(
          Effect.withSpan("PromptPublishing.setChannel"),
          Effect.annotateLogs({
            channel: request.channel,
            orgId: actor.organizationId,
            promptId: id,
          })
        ),
    } satisfies PromptPublishingShape;
  })
);
