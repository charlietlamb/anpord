import { Effect } from "effect";
import { bundledCaseModule } from "./case-modules";
import { isCommand } from "./command";
import { compileValidator } from "./compile-validator";
import { type DefinitionRef, prepareEntry } from "./runner-source";
import { empty, repo } from "./source";
import type { EvalCaseDefinition, EvalDefinition } from "./types";

const sourceFor = (definition: EvalDefinition, subject: EvalCaseDefinition) => {
  const source = subject.source ?? definition.source ?? empty;

  return typeof source === "string" ? repo(source) : source;
};

export const compileCase = (
  ref: DefinitionRef,
  inputs: readonly string[],
  definition: EvalDefinition,
  subject: EvalCaseDefinition,
  caseIndex: number
) =>
  Effect.gen(function* () {
    const name = subject.name ?? subject.id;

    if (subject.validate === undefined) {
      return yield* Effect.fail(new Error(`${name} must have a validate`));
    }

    const verify = isCommand(subject.validate) ? subject.validate.run : null;

    const validator =
      verify === null
        ? yield* compileValidator(
            ref,
            subject,
            caseIndex,
            definition.captureSource !== false,
            definition.captureValidation !== false
          )
        : null;

    const prepare =
      typeof subject.prepare === "function"
        ? yield* bundledCaseModule(
            ref.entry,
            inputs,
            subject.prepare.name || `${name}-prepare`,
            prepareEntry
          )
        : null;

    return {
      ...(subject.cache === undefined ? {} : { cache: subject.cache }),
      id: subject.id,
      name,
      prepare,
      source: sourceFor(definition, subject),
      ...(subject.tags === undefined ? {} : { tags: subject.tags }),
      user: subject.user ?? null,
      validator,
      variables: subject.variables ?? {},
      verify,
    };
  });
