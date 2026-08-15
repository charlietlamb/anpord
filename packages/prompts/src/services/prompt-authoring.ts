import { Cache } from "@anpord/cache/cache";
import type { Actor } from "@anpord/schema/actor";
import type {
  AddVersionRequest,
  PromptId,
  ResolvedPrompt,
} from "@anpord/schema/prompts";
import { PRODUCTION } from "@anpord/schema/prompts";
import { Clock, Context, Effect, Layer } from "effect";
import type { PromptError } from "../domain/errors";
import { promptPrefix } from "../domain/keys";
import { toResolved } from "../domain/views";
import { PromptRepository } from "../repositories/prompt-repository";
import { PromptVersionRepository } from "../repositories/prompt-version-repository";
import { PromptPublishing } from "./prompt-publishing";
import { requirePrompt } from "./require-prompt";

export interface PromptAuthoringShape {
  readonly addVersion: (
    actor: Actor,
    id: PromptId,
    request: AddVersionRequest
  ) => Effect.Effect<ResolvedPrompt, PromptError>;
  readonly listVersions: (
    actor: Actor,
    id: PromptId
  ) => Effect.Effect<readonly ResolvedPrompt[], PromptError>;
}

export class PromptAuthoring extends Context.Tag(
  "@anpord/prompts/PromptAuthoring"
)<PromptAuthoring, PromptAuthoringShape>() {}

export const PromptAuthoringLive = Layer.effect(
  PromptAuthoring,
  Effect.gen(function* () {
    const prompts = yield* PromptRepository;
    const versions = yield* PromptVersionRepository;
    const publishing = yield* PromptPublishing;
    const cache = yield* Cache;

    return {
      addVersion: (actor, id, request) =>
        Effect.gen(function* () {
          const row = yield* requirePrompt(prompts, actor, id);

          const version = yield* versions.append({
            actorId: actor.id,
            commitMessage: request.commitMessage ?? null,
            config: request.config,
            content: request.content,
            promptId: id,
            promptInternalId: row.internalId,
          });

          if (request.publish) {
            yield* publishing.publishVersion({
              actor,
              channel: PRODUCTION,
              promptId: id,
              promptInternalId: row.internalId,
              versionInternalId: version.internalId,
            });
          }

          const now = new Date(yield* Clock.currentTimeMillis);
          yield* prompts.touch(row.internalId, now);
          yield* cache.invalidatePrefix(promptPrefix(actor.organizationId, id));

          return yield* toResolved(
            row,
            request.publish ? PRODUCTION : null,
            version
          );
        }).pipe(
          Effect.withSpan("PromptAuthoring.addVersion"),
          Effect.annotateLogs({ orgId: actor.organizationId, promptId: id })
        ),

      listVersions: (actor, id) =>
        Effect.gen(function* () {
          const row = yield* requirePrompt(prompts, actor, id);
          const rows = yield* versions.list(row.internalId);

          return yield* Effect.all(
            rows.map((version) => toResolved(row, null, version))
          );
        }).pipe(
          Effect.withSpan("PromptAuthoring.listVersions"),
          Effect.annotateLogs({ orgId: actor.organizationId, promptId: id })
        ),
    } satisfies PromptAuthoringShape;
  })
);
