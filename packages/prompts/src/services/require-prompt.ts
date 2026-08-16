import type { Actor } from "@anpord/schema/domain/actor";
import type { PromptId } from "@anpord/schema/domain/prompts";
import { Effect, Option } from "effect";
import { PromptNotFound } from "../domain/errors";
import type { PromptRepositoryShape } from "../repositories/prompt-repository";

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
