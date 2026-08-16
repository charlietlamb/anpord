import { Cache } from "@anpord/cache/cache";
import type { Actor } from "@anpord/schema/actor";
import type { PromptId, PromptSelector } from "@anpord/schema/prompts";
import { ResolvedPrompt } from "@anpord/schema/prompts";
import { Context, Effect, Layer, Option } from "effect";
import type { PromptError } from "../domain/errors";
import {
  ChannelNotFound,
  PromptHasNoVersions,
  VersionNotFound,
} from "../domain/errors";
import { selectorKey } from "../domain/keys";
import type { Resolution } from "../domain/resolution";
import { resolutionFor } from "../domain/resolution";
import { toResolved } from "../domain/views";
import { PromptChannelRepository } from "../repositories/prompt-channel-repository";
import { PromptRepository } from "../repositories/prompt-repository";
import { PromptVersionRepository } from "../repositories/prompt-version-repository";
import { requirePrompt } from "./require-prompt";

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
    const cache = yield* Cache;

    const readVersion = (promptInternalId: string, resolution: Resolution) => {
      switch (resolution._tag) {
        case "ByVersion":
          return versions.byNumber(promptInternalId, resolution.version);
        case "Latest":
          return versions.latest(promptInternalId);
        default:
          return channels.resolve(promptInternalId, resolution.channel);
      }
    };

    const missing = (id: PromptId, resolution: Resolution) => {
      switch (resolution._tag) {
        case "ByVersion":
          return new VersionNotFound({
            promptId: id,
            version: resolution.version,
          });
        case "Latest":
          return new PromptHasNoVersions({ promptId: id });
        default:
          return new ChannelNotFound({
            channel: resolution.channel,
            promptId: id,
          });
      }
    };

    return {
      get: (actor, id, selector = {}) =>
        Effect.gen(function* () {
          const key = selectorKey(actor.organizationId, id, selector);
          const cached = yield* cache.get(key, ResolvedPrompt);

          if (Option.isSome(cached)) {
            return cached.value;
          }

          const row = yield* requirePrompt(prompts, actor, id);
          const resolution = resolutionFor(selector);
          const found = yield* readVersion(row.internalId, resolution);

          const resolved = yield* Option.match(found, {
            onNone: () => Effect.fail(missing(id, resolution)),
            onSome: (version) =>
              toResolved(row, selector.channel ?? null, version),
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
