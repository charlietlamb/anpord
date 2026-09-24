import { resolve } from "node:path";
import { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import { Effect, Schema } from "effect";
import { compileApis, withApis } from "./api-profile";
import { type CompiledCli, compileClis, withClis } from "./cli-profile";
import { compileCase } from "./compile-case";
import { suiteIdProblem } from "./define";
import { isDefinition, loadDefinition } from "./definition-loader";
import { locate } from "./locate";
import {
  type CompiledMcpServer,
  compileMcpServers,
  withMcpServers,
} from "./mcp-profile";
import { profileVariant } from "./profile-directory";
import type { DefinitionRef } from "./runner-source";
import type {
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
      variant.profile === undefined
        ? {
            harness: variant.harness,
            model: variant.model,
            sandbox: variant.sandbox,
          }
        : yield* profileVariant(entry, {
            ...variant,
            profile: variant.profile,
          });

    return yield* Effect.try(() =>
      withApis(withClis(withMcpServers(compiled, mcp), clis), apis)
    );
  });

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

    const idProblem = suiteIdProblem(definition);

    if (idProblem !== null) {
      return yield* Effect.fail(new Error(idProblem));
    }

    const clis = yield* compileClis(ref, definition.cli ?? []);
    const mcp = yield* compileMcpServers(ref, definition.mcp ?? []);
    const apis = yield* compileApis(ref, definition.api ?? []);

    const cases = yield* Effect.forEach(
      definition.cases,
      (subject, caseIndex) =>
        compileCase(ref, loaded.inputs, definition, subject, caseIndex),
      { concurrency: 4 }
    );

    const variants = yield* Effect.forEach(
      definition.variants,
      (variant) => variantOf(entry, variant, clis, mcp, apis),
      { concurrency: 4 }
    );

    return yield* Schema.decodeUnknown(StartBatchRequest)({
      cases,
      suite: {
        id: definition.id,
        name: definition.name ?? definition.id,
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
