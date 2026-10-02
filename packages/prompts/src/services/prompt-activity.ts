import type { Actor } from "@sphynx/schema/domain/actor";
import type { PromptActivityPage } from "@sphynx/schema/domain/prompt-activity";
import type { PromptEventKind } from "@sphynx/schema/domain/prompt-events";
import { Context, Effect, Layer } from "effect";
import {
  ActivityCursorPayload,
  activityCursorFor,
} from "../domain/activity-cursor";
import { decodeCursor, encodeCursor } from "../domain/cursor-codec";
import type { PromptError } from "../domain/errors";
import { toActivityEntry } from "../domain/views";
import { PromptEventRepository } from "../repositories/prompt-event-repository";

export interface ActivityQuery {
  readonly channel?: string;
  readonly cursor?: string;
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
  "@sphynx/prompts/PromptActivity"
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
              : yield* decodeCursor(ActivityCursorPayload, query.cursor);

          /* One more than asked for, so a full page is distinguishable from
             the last without a second empty request. */
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
                ? encodeCursor(activityCursorFor(last))
                : null,
          } satisfies PromptActivityPage;
        }).pipe(
          Effect.withSpan("PromptActivity.list"),
          Effect.annotateLogs({ orgId: actor.organizationId })
        ),
    } satisfies PromptActivityShape;
  })
);
