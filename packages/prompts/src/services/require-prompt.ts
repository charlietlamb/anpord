import type { Actor } from "@anpord/schema/domain/actor";
import type { PromptId } from "@anpord/schema/domain/prompts";
import { Effect, Option } from "effect";
import { PromptNotFound } from "../domain/errors";
import type { OwnedPromptId } from "../domain/owned-prompt";
import type { PromptRepositoryShape } from "../repositories/prompt-repository";

/**
 * Reads a prompt the actor's organisation owns, or fails as though it does not
 * exist — which is also what keeps one organisation from learning whether
 * another's prompt id is taken.
 *
 * The row it returns carries an `internalId` the mutating repository methods
 * accept, so every write is reachable only from a read that was scoped.
 */
export const requirePrompt = (
  prompts: PromptRepositoryShape,
  actor: Actor,
  id: PromptId
) =>
  prompts.findById(actor.organizationId, id).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(new PromptNotFound({ id })),
        onSome: (row) =>
          Effect.succeed({
            ...row,
            internalId: row.internalId as OwnedPromptId,
          }),
      })
    )
  );
