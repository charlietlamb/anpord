import { Database } from "@anpord/db/client";
import { promptEvent } from "@anpord/db/schema/prompts/prompt-events";
import { IdGenerator } from "@anpord/ids/id";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import type { PromptEventKind } from "@anpord/schema/domain/prompt-events";
import { Context, Effect, Layer } from "effect";
import type { PromptStoreError } from "../domain/errors";
import {
  type PromptEventListParams,
  selectPromptEventList,
} from "./prompt-event-list-query";
import { tryStore } from "./query";

interface RecordEventInput {
  readonly actorId: string | null;
  readonly kind: PromptEventKind;
  readonly promptInternalId: string;
  readonly versionInternalId: string | null;
}

export interface PromptEventRow {
  /** Left-joined onto a nullable actor, so a deleted user arrives as a row of
   * nulls rather than as no row. */
  readonly actor: {
    readonly image: string | null;
    readonly name: string | null;
  } | null;
  readonly at: Date;
  /** Named by a channel move, and nothing else. */
  readonly channel: string | null;
  readonly from: number | null;
  readonly internalId: string;
  readonly kind: string;
  readonly message: string | null;
  readonly promptId: string;
  readonly version: number | null;
}

export interface PromptEventRepositoryShape {
  readonly list: (
    organizationId: OrganizationId,
    params: PromptEventListParams
  ) => Effect.Effect<readonly PromptEventRow[], PromptStoreError>;
  readonly record: (
    input: RecordEventInput
  ) => Effect.Effect<void, PromptStoreError>;
}

export class PromptEventRepository extends Context.Tag(
  "@anpord/prompts/PromptEventRepository"
)<PromptEventRepository, PromptEventRepositoryShape>() {}

export const PromptEventRepositoryLive = Layer.effect(
  PromptEventRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    return {
      list: (organizationId, params) =>
        tryStore("promptEvent.list", () =>
          selectPromptEventList(db, organizationId, params)
        ),

      record: (input) =>
        Effect.flatMap(ids.generate("promptEvent"), (internalId) =>
          tryStore("promptEvent.record", async () => {
            await db.insert(promptEvent).values({ ...input, internalId });
          })
        ),
    } satisfies PromptEventRepositoryShape;
  })
);
