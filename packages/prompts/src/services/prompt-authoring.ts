import { type Actor, authorIdOf } from "@anpord/schema/domain/actor";
import type {
  AddVersionRequest,
  PromptId,
  ResolvedPrompt,
  UpdateVersionRequest,
} from "@anpord/schema/domain/prompts";
import { ChannelName } from "@anpord/schema/domain/prompts";
import { Clock, Context, Effect, Layer, Option } from "effect";
import { answeringChannels } from "../domain/answering-channels";
import type { PromptError } from "../domain/errors";
import { VersionNotFound } from "../domain/errors";
import { toResolved } from "../domain/views";
import { ChannelRepository } from "../repositories/channel-repository";
import { PromptChannelRepository } from "../repositories/prompt-channel-repository";
import { PromptRepository } from "../repositories/prompt-repository";
import { PromptVersionRepository } from "../repositories/prompt-version-repository";
import { PromptCache } from "./prompt-cache";
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
  readonly updateVersion: (
    actor: Actor,
    id: PromptId,
    version: number,
    request: UpdateVersionRequest
  ) => Effect.Effect<ResolvedPrompt, PromptError>;
}

export class PromptAuthoring extends Context.Tag(
  "@anpord/prompts/PromptAuthoring"
)<PromptAuthoring, PromptAuthoringShape>() {}

export const PromptAuthoringLive = Layer.effect(
  PromptAuthoring,
  Effect.gen(function* () {
    const prompts = yield* PromptRepository;
    const versions = yield* PromptVersionRepository;
    const channels = yield* PromptChannelRepository;
    const channelCatalog = yield* ChannelRepository;
    const publishing = yield* PromptPublishing;
    const promptCache = yield* PromptCache;

    return {
      addVersion: (actor, id, request) =>
        Effect.gen(function* () {
          const row = yield* requirePrompt(prompts, actor, id);

          const version = yield* versions.append({
            authorId: authorIdOf(actor),
            commitMessage: request.commitMessage ?? null,
            config: request.config,
            content: request.content,
            promptId: id,
            promptInternalId: row.internalId,
          });

          /* Published to the channel the organisation answers a bare request
             from. Holding none, the newest version already answers, so there
             is nowhere a publish would make it more readable. */
          const fallback = yield* channelCatalog.defaultChannel(
            actor.organizationId
          );
          const channel = Option.map(fallback, (channelRow) =>
            ChannelName.make(channelRow.name)
          );
          const publishedTo =
            request.publish && Option.isSome(channel) ? channel.value : null;

          if (publishedTo !== null) {
            yield* publishing.publishVersion({
              actor,
              channel: publishedTo,
              promptId: id,
              promptInternalId: row.internalId,
              versionInternalId: version.internalId,
            });
          }

          const now = new Date(yield* Clock.currentTimeMillis);
          yield* prompts.touch(row.internalId, now);
          yield* promptCache.invalidate(actor.organizationId, id);

          return yield* toResolved(row, publishedTo, version);
        }).pipe(
          Effect.withSpan("PromptAuthoring.addVersion"),
          Effect.annotateLogs({ orgId: actor.organizationId, promptId: id })
        ),

      updateVersion: (actor, id, version, request) =>
        Effect.gen(function* () {
          const row = yield* requirePrompt(prompts, actor, id);

          const updated = yield* versions.update({
            commitMessage: request.commitMessage,
            config: request.config,
            content: request.content,
            promptInternalId: row.internalId,
            version,
          });

          const target = yield* Option.match(updated, {
            onNone: () =>
              Effect.fail(new VersionNotFound({ promptId: id, version })),
            onSome: Effect.succeed,
          });

          const placements = yield* channels.list(row.internalId);
          const channelOf = yield* answeringChannels(placements);

          const now = new Date(yield* Clock.currentTimeMillis);
          yield* prompts.touch(row.internalId, now);
          yield* promptCache.invalidate(actor.organizationId, id);

          return yield* toResolved(row, channelOf(target.internalId), target);
        }).pipe(
          Effect.withSpan("PromptAuthoring.updateVersion"),
          Effect.annotateLogs({
            orgId: actor.organizationId,
            promptId: id,
            version,
          })
        ),

      listVersions: (actor, id) =>
        Effect.gen(function* () {
          const row = yield* requirePrompt(prompts, actor, id);
          const [rows, placements] = yield* Effect.all([
            versions.list(row.internalId),
            channels.list(row.internalId),
          ]);

          const channelOf = yield* answeringChannels(placements);

          return yield* Effect.all(
            rows.map((version) =>
              toResolved(row, channelOf(version.internalId), version)
            )
          );
        }).pipe(
          Effect.withSpan("PromptAuthoring.listVersions"),
          Effect.annotateLogs({ orgId: actor.organizationId, promptId: id })
        ),
    } satisfies PromptAuthoringShape;
  })
);
