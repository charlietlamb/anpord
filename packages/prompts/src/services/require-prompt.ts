import type { Actor } from "@anpord/schema/domain/actor";
import type { PromptId } from "@anpord/schema/domain/prompts";
import { Effect, Option } from "effect";
import { PromptNotFound } from "../domain/errors";
import type { OwnedPromptId } from "../domain/owned-prompt";
import type { PromptRepositoryShape } from "../repositories/prompt-repository";

/* Fails as not-found rather than forbidden, so one organisation cannot learn
   whether another's prompt id is taken. */
export const requirePrompt = (
  prompts: PromptRepositoryShape,
  actor: Actor,
  id: PromptId
) => scopedRead(prompts.findById(actor.organizationId, id), id);

/* Archiving hides a prompt from the dashboard without retiring the versions a
   running service already pinned itself to. */
export const requireReadablePrompt = (
  prompts: PromptRepositoryShape,
  actor: Actor,
  id: PromptId
) =>
  scopedRead(prompts.findByIdIncludingArchived(actor.organizationId, id), id);

const scopedRead = (
  read: ReturnType<PromptRepositoryShape["findById"]>,
  id: PromptId
) =>
  read.pipe(
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
