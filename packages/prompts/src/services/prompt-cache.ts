import { Cache } from "@anpord/cache/cache";
import type { OrganizationId } from "@anpord/schema/actor";
import type { PromptId } from "@anpord/schema/prompts";
import { Context, Effect, Layer } from "effect";
import { promptPrefix } from "../domain/keys";

export interface PromptCacheShape {
  readonly invalidate: (
    organizationId: OrganizationId,
    ...handles: readonly PromptId[]
  ) => Effect.Effect<void>;
}

export class PromptCache extends Context.Tag("@anpord/prompts/PromptCache")<
  PromptCache,
  PromptCacheShape
>() {}

export const PromptCacheLive = Layer.effect(
  PromptCache,
  Effect.gen(function* () {
    const cache = yield* Cache;

    return PromptCache.of({
      invalidate: (organizationId, ...handles) =>
        Effect.forEach(
          new Set(handles),
          (handle) =>
            cache.invalidatePrefix(promptPrefix(organizationId, handle)),
          { discard: true }
        ),
    });
  })
);
