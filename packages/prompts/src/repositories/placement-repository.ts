import { Database } from "@anpord/db/client";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import { Context, Effect, Layer } from "effect";
import type { PromptStoreError } from "../domain/errors";
import {
  type PlacementListParams,
  selectPlacementPrompts,
  selectPlacementsFor,
  selectPlacementTotals,
} from "./placement-list-query";
import { tryStore } from "./query";

export interface PlacementPromptRow {
  readonly id: string;
  readonly internalId: string;
  readonly latestVersion: number | null;
  readonly name: string;
  readonly updatedAt: Date;
}

export interface PlacementRow {
  readonly channel: string;
  readonly promptInternalId: string;
  readonly updatedAt: Date;
  /** Left-joined onto a nullable actor, so a deleted user arrives as a row of
   * nulls rather than as no row. */
  readonly updatedBy: {
    readonly image: string | null;
    readonly name: string | null;
  } | null;
  readonly version: number;
}

interface PlacementTotalsRow {
  readonly behind: number;
  readonly prompts: number;
}

export interface PlacementRepositoryShape {
  readonly list: (
    organizationId: OrganizationId,
    params: PlacementListParams
  ) => Effect.Effect<readonly PlacementPromptRow[], PromptStoreError>;
  readonly placementsFor: (
    promptInternalIds: readonly string[]
  ) => Effect.Effect<readonly PlacementRow[], PromptStoreError>;
  readonly totals: (
    organizationId: OrganizationId
  ) => Effect.Effect<PlacementTotalsRow, PromptStoreError>;
}

export class PlacementRepository extends Context.Tag(
  "@anpord/prompts/PlacementRepository"
)<PlacementRepository, PlacementRepositoryShape>() {}

const EMPTY_TOTALS: PlacementTotalsRow = { behind: 0, prompts: 0 };

export const PlacementRepositoryLive = Layer.effect(
  PlacementRepository,
  Effect.gen(function* () {
    const db = yield* Database;

    return {
      list: (organizationId, params) =>
        tryStore("placement.list", () =>
          selectPlacementPrompts(db, organizationId, params)
        ),

      placementsFor: (promptInternalIds) =>
        promptInternalIds.length === 0
          ? Effect.succeed([])
          : tryStore("placement.placementsFor", () =>
              selectPlacementsFor(db, promptInternalIds)
            ),

      totals: (organizationId) =>
        tryStore("placement.totals", () =>
          selectPlacementTotals(db, organizationId)
        ).pipe(
          Effect.map((rows) => {
            const row = rows[0];
            return row === undefined
              ? EMPTY_TOTALS
              : { behind: Number(row.behind), prompts: Number(row.prompts) };
          })
        ),
    } satisfies PlacementRepositoryShape;
  })
);
