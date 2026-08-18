import { Cache } from "@anpord/cache/cache";
import type { Actor } from "@anpord/schema/domain/actor";
import type { PromptId, PromptSelector } from "@anpord/schema/domain/prompts";
import {
  ChannelName,
  PRODUCTION,
  ResolvedPrompt,
} from "@anpord/schema/domain/prompts";
import { Context, Effect, Layer, Option } from "effect";
import type { PromptError } from "../domain/errors";
import {
  ChannelNotFound,
  PromptHasNoVersions,
  VersionNotFound,
} from "../domain/errors";
import { selectorKey } from "../domain/keys";
import type { Resolution } from "../domain/resolution";
import { answeringChannel, resolutionFor } from "../domain/resolution";
import { toResolved } from "../domain/views";
import { ChannelRepository } from "../repositories/channel-repository";
import { PromptChannelRepository } from "../repositories/prompt-channel-repository";
import { PromptRepository } from "../repositories/prompt-repository";
import { PromptVersionRepository } from "../repositories/prompt-version-repository";
import { requireReadablePrompt } from "./require-prompt";

export interface PromptResolutionShape {
  readonly get: (
    actor: Actor,
    id: PromptId,
    selector?: PromptSelector
  ) => Effect.Effect<ResolvedPrompt, PromptError>;
}

export class PromptResolution extends Context.Tag(
  "@anpord/prompts/PromptResolution"
)<PromptResolution, PromptResolutionShape>() {}

export const PromptResolutionLive = Layer.effect(
  PromptResolution,
  Effect.gen(function* () {
    const prompts = yield* PromptRepository;
    const versions = yield* PromptVersionRepository;
    const channels = yield* PromptChannelRepository;
    const channelRepository = yield* ChannelRepository;
    const cache = yield* Cache;

    const readSelected = (promptInternalId: string, resolution: Resolution) => {
      if (resolution._tag === "ByVersion") {
        return versions.byNumber(promptInternalId, resolution.version);
      }

      if (resolution._tag === "Latest") {
        return versions.latest(promptInternalId);
      }

      return channels.resolve(
        promptInternalId,
        (resolution as { readonly channel: ChannelName }).channel
      );
    };

    /**
     * A request that named nothing is answered by the organisation's default
     * channel, and by production when it has not chosen one.
     *
     * Production rather than the newest version: a caller who named nothing is
     * asking for what is live, and answering with the newest would ship every
     * draft the moment it was written, which is the one thing channels exist
     * to prevent.
     */
    const readDefault = (
      organizationId: Actor["organizationId"],
      promptInternalId: string
    ) =>
      Effect.gen(function* () {
        const fallback =
          yield* channelRepository.defaultChannel(organizationId);

        if (Option.isNone(fallback)) {
          return {
            channel: PRODUCTION,
            found: yield* channels.resolve(promptInternalId, PRODUCTION),
          };
        }

        const name = ChannelName.make(fallback.value.name);

        return {
          channel: name,
          found: yield* channels.resolve(promptInternalId, name),
        };
      });

    const missing = (
      id: PromptId,
      resolution: Resolution,
      answered: ChannelName | null
    ) => {
      if (resolution._tag === "ByVersion") {
        return new VersionNotFound({
          promptId: id,
          version: resolution.version,
        });
      }

      if (resolution._tag === "Latest") {
        return new PromptHasNoVersions({ promptId: id });
      }

      if (resolution._tag === "ByChannel") {
        return new ChannelNotFound({
          channel: resolution.channel,
          promptId: id,
        });
      }

      return answered === null
        ? new PromptHasNoVersions({ promptId: id })
        : new ChannelNotFound({ channel: answered, promptId: id });
    };

    return {
      get: (actor, id, selector = {}) =>
        Effect.gen(function* () {
          const key = selectorKey(actor.organizationId, id, selector);
          const cached = yield* cache.get(key, ResolvedPrompt);

          if (Option.isSome(cached)) {
            return cached.value;
          }

          const row = yield* requireReadablePrompt(prompts, actor, id);
          const resolution = resolutionFor(selector);

          const read =
            resolution._tag === "Default"
              ? yield* readDefault(actor.organizationId, row.internalId)
              : {
                  channel: null,
                  found: yield* readSelected(row.internalId, resolution),
                };

          const answered = answeringChannel(resolution, read.channel);

          const resolved = yield* Option.match(read.found, {
            onNone: () => Effect.fail(missing(id, resolution, read.channel)),
            onSome: (version) => toResolved(row, answered, version),
          });

          yield* cache.set(key, ResolvedPrompt, resolved);
          return resolved;
        }).pipe(
          Effect.withSpan("PromptResolution.get", {
            attributes: { promptId: id },
          }),
          Effect.annotateLogs({ orgId: actor.organizationId, promptId: id })
        ),
    } satisfies PromptResolutionShape;
  })
);
