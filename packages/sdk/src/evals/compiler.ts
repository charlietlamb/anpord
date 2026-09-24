import { resolve } from "node:path";
import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import { PublicStartBatchRequest } from "@anpord/schema/public/evals-api";
import { Effect, Schema } from "effect";
import { compileApis, withApis } from "./api-profile";
import { bundledCaseModule } from "./case-modules";
import { type CompiledCli, compileClis, withClis } from "./cli-profile";
import { compileValidator } from "./compile-validator";
import { isDefinition, loadDefinition } from "./definition-loader";
import { locate } from "./locate";
import {
  type CompiledMcpServer,
  compileMcpServers,
  withMcpServers,
} from "./mcp-profile";
import { profileVariant } from "./profile-directory";
import { type DefinitionRef, prepareEntry } from "./runner-source";
import { empty, repo } from "./source";
import { suiteIdOf } from "./suite-id";
import type {
  EvalCaseDefinition,
  EvalDefinition,
  EvalVariantDefinition,
  VariantInput,
} from "./types";

const variantOf = (
  entry: string,
  variant: EvalVariantDefinition,
  clis: readonly CompiledCli[],
  mcp: readonly CompiledMcpServer[],
  apis: Readonly<Record<string, string>>
) =>
  Effect.gen(function* () {
    const compiled: VariantInput =
      typeof variant.harness === "string"
        ? {
            harness: variant.harness,
            model: variant.model,
            sandbox: variant.sandbox,
          }
        : yield* profileVariant(entry, {
            ...variant,
            harness: variant.harness,
          });

    return yield* Effect.try(() =>
      withApis(withClis(withMcpServers(compiled, mcp), clis), apis)
    );
  });

const sourceFor = (definition: EvalDefinition, subject: EvalCaseDefinition) => {
  const source = subject.source ?? definition.source ?? empty;

  return typeof source === "string" ? repo(source) : source;
};

const compileRefEffect = (ref: DefinitionRef) =>
  Effect.gen(function* () {
    const entry = ref.entry;
    const loaded = yield* loadDefinition(ref);
    const definition = loaded.definition;

    if (!isDefinition(definition)) {
      const named =
        ref.exportName === null ? "default export" : `export ${ref.exportName}`;

      return yield* Effect.fail(
        new Error(`${entry} must ${named} suite({ ... })`)
      );
    }

    const clis = yield* compileClis(ref, definition.cli ?? []);
    const mcp = yield* compileMcpServers(ref, definition.mcp ?? []);
    const apis = yield* compileApis(ref, definition.api ?? []);

    const cases = yield* Effect.forEach(
      definition.cases,
      (subject, caseIndex) =>
        Effect.gen(function* () {
          const hasValidator = subject.validate !== undefined;
          const hasVerifier = typeof subject.verify === "string";

          if (hasValidator === hasVerifier) {
            return yield* Effect.fail(
              new Error(
                `${subject.name} must have exactly one of validate or verify`
              )
            );
          }

          const validator = yield* compileValidator(
            ref,
            subject,
            caseIndex,
            definition.captureSource !== false,
            definition.captureValidation !== false
          );

          const prepare =
            typeof subject.prepare === "function"
              ? yield* bundledCaseModule(
                  entry,
                  loaded.inputs,
                  subject.prepare.name || `${subject.name}-prepare`,
                  prepareEntry
                )
              : null;

          return {
            ...(subject.cache === undefined ? {} : { cache: subject.cache }),
            id: subject.id,
            name: subject.name,
            prepare,
            source: sourceFor(definition, subject),
            ...(subject.tags === undefined ? {} : { tags: subject.tags }),
            user: subject.user ?? null,
            validator,
            variables: subject.variables ?? {},
            verify: subject.verify ?? null,
          };
        }),
      { concurrency: 4 }
    );

    const variants = yield* Effect.forEach(
      definition.variants,
      (variant) => variantOf(entry, variant, clis, mcp, apis),
      { concurrency: 4 }
    );

    return yield* Schema.decodeUnknown(PublicStartBatchRequest)({
      cases,
      suite: {
        id: definition.id ?? suiteIdOf(definition.name),
        name: definition.name,
        prompt: definition.prompt,
      },
      trials: definition.trials,
      variants,
    });
  }).pipe(Effect.withSpan("Eval.compile"));

const compileDefinitionEffect = (definition: EvalDefinition) =>
  Effect.flatMap(locate(definition), compileRefEffect);

export const compileDefinition = (
  definition: EvalDefinition
): Promise<StartBatchRequest> =>
  Effect.runPromise(compileDefinitionEffect(definition));

const refOfPath = (path: string): DefinitionRef => ({
  entry: resolve(path),
  exportName: null,
});

export const compileEvalEffect = (path: string) =>
  compileRefEffect(refOfPath(path));

export const compileEval = (path: string): Promise<StartBatchRequest> =>
  Effect.runPromise(compileEvalEffect(path));
