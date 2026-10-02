import { Cache } from "@sphynx/cache/cache";
import type { OrganizationId } from "@sphynx/schema/domain/actor";
import type { PromptId } from "@sphynx/schema/domain/prompts";
import { Context, Effect, Layer } from "effect";
import { organizationPrefix, promptPrefix } from "../domain/keys";

export interface PromptCacheShape {
  readonly invalidate: (
    organizationId: OrganizationId,
    ...handles: readonly PromptId[]
  ) => Effect.Effect<void>;
  readonly invalidateOrganization: (
    organizationId: OrganizationId
  ) => Effect.Effect<void>;
}

export class PromptCache extends Context.Tag("@sphynx/prompts/PromptCache")<
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
        ).pipe(Effect.withSpan("PromptCache.invalidate")),

      invalidateOrganization: (organizationId) =>
        cache
          .invalidatePrefix(organizationPrefix(organizationId))
          .pipe(Effect.withSpan("PromptCache.invalidateOrganization")),
    });
  })
);
