import { Effect } from "effect";
import { caseIdentityOf } from "../domain/case-identity";
import { renderPrompt } from "../domain/prompt";
import { TaskRepository } from "../repositories/task-repository";
import type { StartGrid } from "./run";
import { WORKSPACE } from "./trial";

/** Upserts a task row per case, keyed by the case's identity. */
export const makeRegisterCases = Effect.gen(function* () {
  const tasks = yield* TaskRepository;

  return (input: StartGrid) =>
    Effect.forEach(
      input.cases,
      (subject) => {
        const prompt = renderPrompt(input.prompt, subject.variables);

        return tasks.upsertByIdentity({
          cache: subject.cache,
          identity:
            subject.identity ??
            caseIdentityOf({
              name: subject.name,
              prepare: subject.prepare,
              source: subject.source,
              validator: subject.validator,
              variables: subject.variables,
              verifyCommand: subject.verify,
              workspace: WORKSPACE,
            }),
          name: subject.name,
          organizationId: input.organizationId,
          prompt,
          prepare: subject.prepare ?? null,
          source: subject.source,
          validator: subject.validator ?? null,
          verifyCommand: subject.verify,
          workspace: WORKSPACE,
        });
      },
      { concurrency: 4 }
    );
});
