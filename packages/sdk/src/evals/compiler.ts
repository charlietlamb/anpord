import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { EvalSource } from "@anpord/schema/domain/evals";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";
import { Effect, Option } from "effect";
import { build, type Plugin } from "esbuild";
import { localRepo } from "./local-repo";
import { definitionEntry, setupEntry, validatorEntry } from "./runner-source";
import { repo } from "./source";
import type { EvalCaseDefinition, EvalDefinition } from "./types";

const authoringExports = [
  "export const defineEval = value => value;",
  `export { empty, files, repo } from "./source";`,
].join("\n");

const authoringDir = dirname(fileURLToPath(import.meta.url));

const ANPORD_MODULE = /^anpord$/;
const ANY_MODULE = /.*/;

const authoringModule: Plugin = {
  name: "anpord-authoring",
  setup: (compiler) => {
    compiler.onResolve({ filter: ANPORD_MODULE }, () => ({
      namespace: "anpord-authoring",
      path: "anpord",
    }));
    compiler.onLoad(
      { filter: ANY_MODULE, namespace: "anpord-authoring" },
      () => ({
        contents: authoringExports,
        loader: "js",
        resolveDir: authoringDir,
      })
    );
  },
};

const bundle = (contents: string, entry: string) =>
  Effect.tryPromise({
    try: () =>
      build({
        absWorkingDir: process.cwd(),
        bundle: true,
        format: "esm",
        metafile: true,
        platform: "node",
        resolveExtensions: [".ts", ".mjs", ".js", ".cjs", ".json"],
        plugins: [authoringModule],
        stdin: {
          contents,
          resolveDir: process.cwd(),
          sourcefile: "anpord-eval-entry.ts",
        },
        target: "node18",
        treeShaking: true,
        write: false,
      }).then((result) => ({
        inputs: Object.keys(result.metafile?.inputs ?? {}).map((path) =>
          resolve(path)
        ),
        source: result.outputFiles[0]?.text ?? "",
      })),
    catch: (cause) => new Error(`Could not compile ${entry}`, { cause }),
  });

const loadDefinition = (entry: string) =>
  bundle(definitionEntry(entry), entry).pipe(
    Effect.flatMap(({ inputs, source }) =>
      Effect.acquireUseRelease(
        Effect.tryPromise(() => mkdtemp(join(tmpdir(), "anpord-eval-"))),
        (directory) =>
          Effect.tryPromise({
            try: async () => {
              const output = join(directory, "definition.mjs");
              await writeFile(output, source);
              const module = await import(pathToFileURL(output).href);
              return { definition: module.default as unknown, inputs };
            },
            catch: (cause) =>
              new Error(
                `Could not load ${entry}: ${cause instanceof Error ? cause.message : String(cause)}`,
                { cause }
              ),
          }),
        (directory) =>
          Effect.promise(() =>
            rm(directory, { force: true, recursive: true })
          ).pipe(Effect.ignore)
      )
    )
  );

const validatorModule = (
  entry: string,
  inputs: readonly string[],
  name: string
) =>
  Effect.gen(function* () {
    const pattern = new RegExp(
      `\\bexport\\s+(?:async\\s+)?(?:const|function)\\s+${name}\\b`
    );
    const matches = yield* Effect.filter(
      inputs.filter(
        (path) => path !== entry && !path.includes(`${sep}node_modules${sep}`)
      ),
      (path) =>
        Effect.tryPromise(() => readFile(path, "utf8")).pipe(
          Effect.map((source) => pattern.test(source)),
          Effect.orElseSucceed(() => false)
        ),
      { concurrency: 8 }
    );

    if (matches.length !== 1) {
      return yield* Effect.fail(
        new Error(
          `${name} must be one named function or const export from a separate TypeScript file`
        )
      );
    }

    return matches[0] as string;
  });

const isDefinition = (value: unknown): value is EvalDefinition =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as EvalDefinition).name === "string" &&
  typeof (value as EvalDefinition).prompt === "string" &&
  Array.isArray((value as EvalDefinition).cases) &&
  Array.isArray((value as EvalDefinition).tasks) &&
  Number.isInteger((value as EvalDefinition).trials);

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

const bundled = (
  entry: string,
  inputs: readonly string[],
  name: string,
  wrap: (module: string, exported: string) => string
) =>
  Effect.gen(function* () {
    const module = yield* validatorModule(entry, inputs, name);
    const { source } = yield* bundle(wrap(module, name), entry);

    return { name, source };
  });

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

    const needsFallback =
      definition.source === undefined &&
      definition.cases.some((subject) => subject.source === undefined);

    const fallback = needsFallback
      ? yield* localRepo(dirname(entry))
      : Option.none<EvalSource>();

    const cases = yield* Effect.forEach(
      definition.cases,
      (subject) =>
        Effect.gen(function* () {
          const hasValidator = typeof subject.validate === "function";
          const hasVerifier = typeof subject.verify === "string";

          if (hasValidator === hasVerifier) {
            return yield* Effect.fail(
              new Error(
                `${subject.name} must have exactly one of validate or verify`
              )
            );
          }

          const validator = hasValidator
            ? yield* bundled(
                entry,
                loaded.inputs,
                subject.validate?.name || subject.name,
                validatorEntry
              )
            : null;

          const setup =
            typeof subject.setup === "function"
              ? yield* bundled(
                  entry,
                  loaded.inputs,
                  subject.setup.name || `${subject.name}-setup`,
                  setupEntry
                )
              : null;

          return {
            name: subject.name,
            setup,
            ...sourceFor(definition, subject, fallback),
            validator,
            variables: subject.variables ?? {},
            verify: subject.verify ?? null,
          };
        }),
      { concurrency: 4 }
    );

    return {
      cases,
      prompt: definition.prompt,
      tasks: [...definition.tasks],
      trials: definition.trials,
    } satisfies PublicStartEvalRequest;
  }).pipe(Effect.withSpan("Eval.compile"));

export const compileEval = (path: string): Promise<PublicStartEvalRequest> =>
  Effect.runPromise(compileEvalEffect(path));
