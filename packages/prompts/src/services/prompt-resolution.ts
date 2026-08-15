import { Cache } from "@anpord/cache/cache";
import type { Actor } from "@anpord/schema/actor";
import type { PromptId, PromptSelector } from "@anpord/schema/prompts";
import { LATEST, PRODUCTION, ResolvedPrompt } from "@anpord/schema/prompts";
import { Context, Effect, Layer, Option } from "effect";
import type { PromptError } from "../domain/errors";
import { ChannelNotFound, VersionNotFound } from "../domain/errors";
import { selectorKey } from "../domain/keys";
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

    /** `latest` is derived from the version table; every other channel is a pointer. */
    const readVersion = (
      promptInternalId: string,
      selector: PromptSelector
    ) => {
      if (selector.version !== undefined) {
        return versions.byNumber(promptInternalId, selector.version);
      }

      const channel = selector.channel ?? PRODUCTION;
      return channel === LATEST
        ? versions.latest(promptInternalId)
        : channels.resolve(promptInternalId, channel);
    };

    const missing = (id: PromptId, selector: PromptSelector) =>
      selector.version === undefined
        ? new ChannelNotFound({
            channel: selector.channel ?? PRODUCTION,
            promptId: id,
          })
        : new VersionNotFound({ promptId: id, version: selector.version });

    return {
      get: (actor, id, selector = {}) =>
        Effect.gen(function* () {
          const key = selectorKey(actor.organizationId, id, selector);
          const cached = yield* cache.get(key, ResolvedPrompt);

          if (Option.isSome(cached)) {
            return cached.value;
          }

          const row = yield* requirePrompt(prompts, actor, id);
          const found = yield* readVersion(row.internalId, selector);

          const resolved = yield* Option.match(found, {
            onNone: () => Effect.fail(missing(id, selector)),
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
