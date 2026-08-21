import type { Actor } from "@anpord/schema/domain/actor";
import type { PromptActivityPage } from "@anpord/schema/domain/prompt-activity";
import type { PromptEventKind } from "@anpord/schema/domain/prompt-events";
import { Context, Effect, Layer } from "effect";
import {
  activityCursorFor,
  decodeActivityCursor,
  encodeActivityCursor,
} from "../domain/activity-cursor";
import type { PromptError } from "../domain/errors";
import { toActivityEntry } from "../domain/views";
import { PromptEventRepository } from "../repositories/prompt-event-repository";

export interface ActivityQuery {
  readonly channel?: string;
  readonly cursor?: string;
  /** Narrows to one kind, which is how a deployment log is read out of the
   * same table the whole history lives in. */
  readonly kind?: PromptEventKind;
  readonly limit: number;
  readonly promptId?: string;
}

export interface PromptActivityShape {
  readonly list: (
    actor: Actor,
    query: ActivityQuery
  ) => Effect.Effect<PromptActivityPage, PromptError>;
}

export class PromptActivity extends Context.Tag(
  "@anpord/prompts/PromptActivity"
)<PromptActivity, PromptActivityShape>() {}

export const PromptActivityLive = Layer.effect(
  PromptActivity,
  Effect.gen(function* () {
    const events = yield* PromptEventRepository;

    return {
      list: (actor, query) =>
        Effect.gen(function* () {
          const cursor =
            query.cursor === undefined
              ? undefined
              : yield* decodeActivityCursor(query.cursor);

          /** One more than asked for, so a full page can be told apart from the
           * last one without a second request that returns nothing. */
          const rows = yield* events.list(actor.organizationId, {
            channel: query.channel,
            cursor,
            kind: query.kind,
            limit: query.limit + 1,
            promptId: query.promptId,
          });

          const page = rows.slice(0, query.limit);
          const last = page.at(-1);

          return {
            items: yield* Effect.all(page.map(toActivityEntry)),
            nextCursor:
              rows.length > query.limit && last !== undefined
                ? encodeActivityCursor(activityCursorFor(last))
                : null,
          } satisfies PromptActivityPage;
        }).pipe(
          Effect.withSpan("PromptActivity.list"),
          Effect.annotateLogs({ orgId: actor.organizationId })
        ),
    } satisfies PromptActivityShape;
  })
);
