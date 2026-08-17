import type { Actor } from "@anpord/schema/domain/actor";
import type {
  ApplyPlacementsRequest,
  ApplyPlacementsResponse,
  PlacementChange,
  PlacementPage,
} from "@anpord/schema/domain/placements";
import { PromptId, PromptName } from "@anpord/schema/domain/prompts";
import { Context, Effect, Layer } from "effect";
import type { PromptError } from "../domain/errors";
import {
  decodePromptCursor,
  encodePromptCursor,
} from "../domain/prompt-cursor";
import { toPromptPlacements } from "../domain/views";
import {
  PlacementRepository,
  type PlacementRow,
} from "../repositories/placement-repository";
import { PromptPublishing } from "./prompt-publishing";

export interface PlacementQuery {
  readonly cursor?: string;
  readonly limit: number;
  readonly search?: string;
}

export interface PlacementsShape {
  readonly apply: (
    actor: Actor,
    request: ApplyPlacementsRequest
  ) => Effect.Effect<ApplyPlacementsResponse, PromptError>;
  readonly list: (
    actor: Actor,
    query: PlacementQuery
  ) => Effect.Effect<PlacementPage, PromptError>;
}

export class Placements extends Context.Tag("@anpord/prompts/Placements")<
  Placements,
  PlacementsShape
>() {}

/** Grouped in one pass so the page costs one query for prompts and one for
 * their placements, however many rows it holds. */
const groupByPrompt = (rows: readonly PlacementRow[]) => {
  const grouped = new Map<string, PlacementRow[]>();

  for (const row of rows) {
    const existing = grouped.get(row.promptInternalId);
    if (existing === undefined) {
      grouped.set(row.promptInternalId, [row]);
    } else {
      existing.push(row);
    }
  }

  return grouped;
};

/** A rejected change reports the rule that rejected it rather than a stack:
 * the caller is a person looking at a grid, and "no version 9" is what they
 * need to see against the cell that failed. */
const reasonFor = (error: PromptError) => {
  switch (error._tag) {
    case "PromptNotFound":
      return `No prompt with id "${error.id}"`;
    case "VersionNotFound":
      return `Version ${error.version} does not exist`;
    case "ChannelMissing":
      return `No channel named "${error.channel}"`;
    default:
      return "Could not move this channel";
  }
};

export const PlacementsLive = Layer.effect(
  Placements,
  Effect.gen(function* () {
    const placements = yield* PlacementRepository;
    const publishing = yield* PromptPublishing;

    const applyOne = (actor: Actor, change: PlacementChange) =>
      publishing
        .setChannel(actor, change.promptId, {
          channel: change.channel,
          version: change.version,
        })
        .pipe(
          Effect.as({ change, error: null }),
          Effect.catchAll((error: PromptError) =>
            Effect.succeed({ change, error: reasonFor(error) })
          )
        );

    return {
      /** Applied one at a time rather than concurrently: two changes to the
       * same channel would otherwise race, and the last writer would win
       * without either caller being told. */
      apply: (actor, request) =>
        Effect.forEach(request.changes, (change) =>
          applyOne(actor, change)
        ).pipe(
          Effect.map((results) => ({ results })),
          Effect.withSpan("Placements.apply"),
          Effect.annotateLogs({
            changes: request.changes.length,
            orgId: actor.organizationId,
          })
        ),

      list: (actor, query) =>
        Effect.gen(function* () {
          const cursor =
            query.cursor === undefined
              ? undefined
              : yield* decodePromptCursor(query.cursor, "name");

          const rows = yield* placements.list(actor.organizationId, {
            cursor,
            limit: query.limit,
            search: query.search,
          });

          const page = rows.slice(0, query.limit);
          const last = page.at(-1);

          const [placementRows, totals] = yield* Effect.all([
            placements.placementsFor(page.map((row) => row.internalId)),
            placements.totals(actor.organizationId),
          ]);

          const grouped = groupByPrompt(placementRows);

          const items = yield* Effect.forEach(page, (row) =>
            toPromptPlacements(row, grouped.get(row.internalId) ?? [])
          );

          return {
            items,
            /** Ordered by name, so the cursor carries the name it paged on. */
            nextCursor:
              rows.length > query.limit && last !== undefined
                ? encodePromptCursor({
                    id: PromptId.make(last.id),
                    name: PromptName.make(last.name),
                    sort: "name",
                  })
                : null,
            totals,
          } satisfies PlacementPage;
        }).pipe(
          Effect.withSpan("Placements.list"),
          Effect.annotateLogs({ orgId: actor.organizationId })
        ),
    } satisfies PlacementsShape;
  })
);
