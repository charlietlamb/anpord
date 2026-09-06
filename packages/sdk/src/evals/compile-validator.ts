import { EvalJudge } from "@anpord/schema/domain/eval-judges";
import { EvalValidator } from "@anpord/schema/domain/evals";
import { Effect, Schema } from "effect";
import { bundle } from "./eval-bundle";
import {
  type DefinitionRef,
  definitionEntry,
  validatorCaseEntry,
} from "./runner-source";
import type { EvalCaseDefinition, Validator } from "./types";

export const compileValidator = (
  ref: DefinitionRef,
  subject: EvalCaseDefinition,
  caseIndex: number,
  captureSource: boolean,
  captureValidation = true
) =>
  Effect.gen(function* () {
    if (subject.validate === undefined) {
      return null;
    }
    const validations: readonly (Validator | EvalJudge)[] = Array.isArray(
      subject.validate
    )
      ? subject.validate
      : [subject.validate];
    if (validations.length === 0 || validations.length > 20) {
      return yield* Effect.fail(new Error("Use between 1 and 20 validators"));
    }
    const judges = yield* Effect.forEach(
      validations.filter((value) => typeof value !== "function"),
      (value) =>
        Schema.decodeUnknown(EvalJudge)(value, { onExcessProperty: "error" })
    );
    if (new Set(judges.map(({ name }) => name)).size !== judges.length) {
      return yield* Effect.fail(
        new Error("Judge names must be unique within a case")
      );
    }
    const manifest = validations.flatMap((value, index) =>
      typeof value === "function"
        ? [{ index, name: value.name || `Validator ${index + 1}` }]
        : []
    );
    const hasCode = manifest.length > 0;
    const compiled = yield* bundle(
      hasCode
        ? validatorCaseEntry(ref, caseIndex, manifest)
        : definitionEntry(ref),
      ref.entry,
      { minify: true, captureSource }
    );
    const checks = hasCode
      ? [
          {
            name:
              typeof subject.validate === "function"
                ? subject.validate.name || subject.name
                : subject.name,
            source: compiled.source,
            manifest,
            capture: captureValidation,
          },
        ]
      : [];
    return yield* Schema.decodeUnknown(EvalValidator)({
      ...(judges.length > 0
        ? { kind: "judged", name: subject.name, checks, judges }
        : checks[0]),
      sourceFiles: compiled.sourceFiles,
      capture: captureValidation,
    });
  });
