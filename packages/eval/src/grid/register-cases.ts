import { Effect } from "effect";
import { definitionHashOf } from "../domain/case-identity";
import { renderPrompt } from "../domain/prompt";
import { CaseRepository } from "../repositories/case-repository";
import { TaskRepository } from "../repositories/task-repository";
import type { StartGrid } from "./run";
import { WORKSPACE } from "./trial";

export const makeRegisterCases = Effect.gen(function* () {
  const cases = yield* CaseRepository;
  const tasks = yield* TaskRepository;

  return (input: StartGrid) =>
    Effect.forEach(
      input.cases,
      (subject) =>
        Effect.gen(function* () {
          const prompt = renderPrompt(input.prompt, subject.variables);

          const owner = yield* cases.resolve({
            id: subject.id,
            name: subject.name,
            organizationId: input.organizationId,
          });

          return yield* tasks.upsertByDefinition({
            cache: subject.cache,
            caseInternalId: owner.internalId,
            createdBy: input.startedBy,
            definitionHash: definitionHashOf({
              name: subject.name,
              prepare: subject.prepare,
              source: subject.source,
              user: subject.user,
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
            tags: subject.tags,
            user: subject.user,
            validator: subject.validator ?? null,
            verifyCommand: subject.verify,
            workspace: WORKSPACE,
          });
        }),
      { concurrency: 4 }
    );
});
