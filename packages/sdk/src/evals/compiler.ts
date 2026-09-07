import { resolve } from "node:path";
import { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";
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
import { profileTask } from "./profile-directory";
import { tooLargeToSubmit } from "./request-size";
import { type DefinitionRef, prepareEntry } from "./runner-source";
import { repo } from "./source";
import type {
  EvalCaseDefinition,
  EvalDefinition,
  EvalTaskDefinition,
} from "./types";

type PublicEvalTask = PublicStartEvalRequest["tasks"][number];

const taskOf = (
  entry: string,
  task: EvalTaskDefinition,
  clis: readonly CompiledCli[],
  mcp: readonly CompiledMcpServer[],
  apis: Readonly<Record<string, string>>
) =>
  Effect.gen(function* () {
    const compiled: PublicEvalTask =
      typeof task.harness === "string"
        ? {
            harness: task.harness,
            model: task.model,
            sandbox: task.sandbox,
          }
        : yield* profileTask(entry, { ...task, harness: task.harness });

    return yield* Effect.try(() =>
      withApis(withClis(withMcpServers(compiled, mcp), clis), apis)
    );
  });

/* An omitted source is an empty workspace, so a suite runs the same on a
   laptop as it does in CI. A run that wants the repository names it. */
const sourceFor = (definition: EvalDefinition, subject: EvalCaseDefinition) => {
  const source = subject.source ?? definition.source;

  return source === undefined
    ? {}
    : { source: typeof source === "string" ? repo(source) : source };
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
            name: subject.name,
            prepare,
            ...sourceFor(definition, subject),
            validator,
            variables: subject.variables ?? {},
            verify: subject.verify ?? null,
          };
        }),
      { concurrency: 4 }
    );

    const tasks = yield* Effect.forEach(
      definition.tasks,
      (task) => taskOf(entry, task, clis, mcp, apis),
      { concurrency: 4 }
    );

    const request = yield* Schema.decodeUnknown(PublicStartEvalRequest)({
      cases,
      name: definition.name,
      prompt: definition.prompt,
      tasks,
      trials: definition.trials,
    });

    const tooLarge = tooLargeToSubmit(request);

    return tooLarge === null
      ? request
      : yield* Effect.fail(new Error(tooLarge));
  }).pipe(Effect.withSpan("Eval.compile"));

const compileDefinitionEffect = (definition: EvalDefinition) =>
  Effect.flatMap(locate(definition), compileRefEffect);

export const compileDefinition = (
  definition: EvalDefinition
): Promise<PublicStartEvalRequest> =>
  Effect.runPromise(compileDefinitionEffect(definition));

const refOfPath = (path: string): DefinitionRef => ({
  entry: resolve(path),
  exportName: null,
});

export const compileEvalEffect = (path: string) =>
  compileRefEffect(refOfPath(path));

export const compileEval = (path: string): Promise<PublicStartEvalRequest> =>
  Effect.runPromise(compileEvalEffect(path));
