import type { Actor } from "@anpord/schema/actor";
import type { PromptId } from "@anpord/schema/prompts";
import { Effect, Option } from "effect";
import { PromptNotFound } from "../domain/errors";
import type { PromptRepositoryShape } from "../repositories/prompt-repository";

/**
 * Scoping and existence are the same lookup: a prompt in another organization
 * is indistinguishable from one that does not exist.
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
        onSome: Effect.succeed,
      })
    )
  );
