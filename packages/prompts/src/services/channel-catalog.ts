import { IdGenerator } from "@anpord/ids/id";
import type { Actor } from "@anpord/schema/domain/actor";
import type {
  Channel,
  CreateChannelRequest,
  UpdateChannelRequest,
} from "@anpord/schema/domain/channels";
import type { ChannelName } from "@anpord/schema/domain/prompts";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { Clock, Context, Effect, Layer, Option } from "effect";
import type { PromptError } from "../domain/errors";
import {
  ChannelInUse,
  ChannelMissing,
  ChannelNameTaken,
  ChannelReserved,
} from "../domain/errors";
import { toChannel } from "../domain/views";
import { ChannelRepository } from "../repositories/channel-repository";
import { PromptCache } from "./prompt-cache";

export interface ChannelCatalogShape {
  readonly create: (
    actor: Actor,
    request: CreateChannelRequest
  ) => Effect.Effect<Channel, PromptError>;
  readonly list: (
    actor: Actor
  ) => Effect.Effect<readonly Channel[], PromptError>;
  readonly remove: (
    actor: Actor,
    name: ChannelName
  ) => Effect.Effect<void, PromptError>;
  readonly update: (
    actor: Actor,
    name: ChannelName,
    request: UpdateChannelRequest
  ) => Effect.Effect<Channel, PromptError>;
}

export class ChannelCatalog extends Context.Tag(
  "@anpord/prompts/ChannelCatalog"
)<ChannelCatalog, ChannelCatalogShape>() {}

export const ChannelCatalogLive = Layer.effect(
  ChannelCatalog,
  Effect.gen(function* () {
    const channels = yield* ChannelRepository;
    const promptCache = yield* PromptCache;
    const ids = yield* IdGenerator;

    const requireReserved = (name: ChannelName) =>
      name === PRODUCTION
        ? Effect.fail(new ChannelReserved({ channel: name }))
        : Effect.void;

    const requireNameFree = (actor: Actor, name: ChannelName) =>
      Effect.gen(function* () {
        const existing = yield* channels.byName(actor.organizationId, name);

        if (Option.isSome(existing)) {
          return yield* Effect.fail(new ChannelNameTaken({ channel: name }));
        }
      });

    const requireChannel = (actor: Actor, name: ChannelName) =>
      channels.byName(actor.organizationId, name).pipe(
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.fail(new ChannelMissing({ channel: name })),
            onSome: Effect.succeed,
          })
        )
      );

    const readBack = (actor: Actor, name: ChannelName) =>
      Effect.gen(function* () {
        const rows = yield* channels.list(actor.organizationId);
        const found = rows.find((row) => row.name === name);

        return found === undefined
          ? yield* Effect.fail(new ChannelMissing({ channel: name }))
          : yield* toChannel(found);
      });

    return {
      list: (actor) =>
        Effect.gen(function* () {
          const rows = yield* channels.list(actor.organizationId);
          return yield* Effect.all(rows.map(toChannel));
        }).pipe(
          Effect.withSpan("ChannelCatalog.list"),
          Effect.annotateLogs({ orgId: actor.organizationId })
        ),

      create: (actor, request) =>
        Effect.gen(function* () {
          yield* requireNameFree(actor, request.name);

          const internalId = yield* ids.generate("channel");
          const createdAt = new Date(yield* Clock.currentTimeMillis);

          yield* channels.insert({
            color: request.color,
            createdAt,
            internalId,
            name: request.name,
            organizationId: actor.organizationId,
          });

          yield* Effect.logInfo("channel created");

          return yield* readBack(actor, request.name);
        }).pipe(
          Effect.withSpan("ChannelCatalog.create"),
          Effect.annotateLogs({ orgId: actor.organizationId })
        ),

      update: (actor, name, request) =>
        Effect.gen(function* () {
          const row = yield* requireChannel(actor, name);
          const renaming = request.name !== undefined && request.name !== name;

          if (renaming) {
            yield* requireReserved(name);
            yield* requireNameFree(actor, request.name as ChannelName);
          }

          yield* channels.update(row.internalId, request);

          /** A rename changes what `GET /prompts/:id?channel=` resolves, so
           * every prompt reachable through this channel must be re-read. */
          yield* promptCache.invalidateOrganization(actor.organizationId);

          yield* Effect.logInfo("channel updated");

          return yield* readBack(actor, request.name ?? name);
        }).pipe(
          Effect.withSpan("ChannelCatalog.update"),
          Effect.annotateLogs({ orgId: actor.organizationId })
        ),

      remove: (actor, name) =>
        Effect.gen(function* () {
          yield* requireReserved(name);

          const row = yield* requireChannel(actor, name);
          const rows = yield* channels.list(actor.organizationId);
          const promptCount =
            rows.find((entry) => entry.name === name)?.promptCount ?? 0;

          if (promptCount > 0) {
            return yield* Effect.fail(
              new ChannelInUse({ channel: name, promptCount })
            );
          }

          yield* channels.remove(row.internalId);
          yield* promptCache.invalidateOrganization(actor.organizationId);
          yield* Effect.logInfo("channel removed");
        }).pipe(
          Effect.withSpan("ChannelCatalog.remove"),
          Effect.annotateLogs({ orgId: actor.organizationId })
        ),
    } satisfies ChannelCatalogShape;
  })
);
