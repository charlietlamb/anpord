import { dirname, resolve } from "node:path";
import type { EvalSource } from "@anpord/schema/domain/evals";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";
import { Effect, Option } from "effect";
import { bundledCaseModule } from "./case-modules";
import { type CompiledCli, compileClis, withClis } from "./cli-profile";
import { compileValidator } from "./compile-validator";
import { isDefinition, loadDefinition } from "./definition-loader";
import { localRepo } from "./local-repo";
import {
  type CompiledMcpServer,
  compileMcpServers,
  withMcpServers,
} from "./mcp-profile";
import { profileTask } from "./profile-directory";
import { prepareEntry } from "./runner-source";
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
  mcp: readonly CompiledMcpServer[]
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
      withClis(withMcpServers(compiled, mcp), clis)
    );
  });

const sourceFor = (
  definition: EvalDefinition,
  subject: EvalCaseDefinition,
  fallback: Option.Option<EvalSource>
) => {
  const source = subject.source ?? definition.source;

  if (source !== undefined) {
    return { source: typeof source === "string" ? repo(source) : source };
  }

  return Option.match(fallback, {
    onNone: () => ({}),
    onSome: (source) => ({ source }),
  });
};

export const compileEvalEffect = (path: string) =>
  Effect.gen(function* () {
    const entry = resolve(path);
    const loaded = yield* loadDefinition(entry);
    const definition = loaded.definition;

    if (!isDefinition(definition)) {
      return yield* Effect.fail(
        new Error(`${entry} must default export defineEval({ ... })`)
      );
    }

    const clis = yield* compileClis(entry, definition.cli ?? []);
    const mcp = yield* compileMcpServers(entry, definition.mcp ?? []);

    const needsFallback =
      definition.source === undefined &&
      definition.cases.some((subject) => subject.source === undefined);

    const fallback = needsFallback
      ? yield* localRepo(dirname(entry))
      : Option.none<EvalSource>();

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
            entry,
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
            ...sourceFor(definition, subject, fallback),
            validator,
            variables: subject.variables ?? {},
            verify: subject.verify ?? null,
          };
        }),
      { concurrency: 4 }
    );

    const tasks = yield* Effect.forEach(
      definition.tasks,
      (task) => taskOf(entry, task, clis, mcp),
      { concurrency: 4 }
    );

    return {
      cases,
      name: definition.name,
      prompt: definition.prompt,
      tasks,
      trials: definition.trials,
    } satisfies PublicStartEvalRequest;
  }).pipe(Effect.withSpan("Eval.compile"));

export const compileEval = (path: string): Promise<PublicStartEvalRequest> =>
  Effect.runPromise(compileEvalEffect(path));
