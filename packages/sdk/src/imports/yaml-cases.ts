import { FileSystem } from "@effect/platform";
import { Effect, ParseResult } from "effect";
import type { ImportedSuite } from "./evals-json";
import { CaseFileUnreadable } from "./evals-json-errors";
import {
  CaseDirectoryEmpty,
  CaseDirectoryUnreadable,
  CaseFileNotYaml,
  CaseFileNotYamlCase,
} from "./yaml-cases-errors";
import {
  renderYamlSuite,
  tallyOf,
  type YamlCaseFile,
} from "./yaml-cases-render";
import { decodeYamlCase } from "./yaml-cases-schema";
import { parseYamlDocument } from "./yaml-document";

const SUFFIXES = [".yaml", ".yml"];

const reasonFor = (error: ParseResult.ParseError) =>
  ParseResult.ArrayFormatter.formatError(error).pipe(
    Effect.map((issues) =>
      issues
        .map((issue) => `${issue.path.map(String).join(".")}: ${issue.message}`)
        .join("; ")
    )
  );

const decode = (path: string, parsed: unknown) =>
  decodeYamlCase(parsed).pipe(
    Effect.catchTag("ParseError", (error) =>
      reasonFor(error).pipe(
        Effect.flatMap((reason) =>
          Effect.fail(new CaseFileNotYamlCase({ path, reason }))
        )
      )
    )
  );

const readCase = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const body = yield* fs
      .readFileString(path)
      .pipe(
        Effect.mapError((cause) => new CaseFileUnreadable({ cause, path }))
      );

    const parsed = yield* parseYamlDocument(body).pipe(
      Effect.mapError((reason) => new CaseFileNotYaml({ path, reason }))
    );

    const file: YamlCaseFile = { path, subject: yield* decode(path, parsed) };
    return file;
  });

/** Sorted, so the same directory always produces the same suite and a diff of
 * two imports shows what changed rather than what moved. */
const caseFilesIn = (directory: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const entries = yield* fs
      .readDirectory(directory)
      .pipe(
        Effect.mapError(
          (cause) => new CaseDirectoryUnreadable({ cause, path: directory })
        )
      );

    return entries
      .filter((entry) => SUFFIXES.some((suffix) => entry.endsWith(suffix)))
      .toSorted()
      .map((entry) => `${directory}/${entry}`);
  });

const readDirectory = (directory: string) =>
  Effect.gen(function* () {
    const paths = yield* caseFilesIn(directory);

    if (paths.length === 0) {
      return yield* Effect.fail(new CaseDirectoryEmpty({ path: directory }));
    }

    return yield* Effect.all(paths.map(readCase));
  });

const readPath = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const info = yield* fs
      .stat(path)
      .pipe(
        Effect.mapError((cause) => new CaseFileUnreadable({ cause, path }))
      );

    return info.type === "Directory"
      ? yield* readDirectory(path)
      : [yield* readCase(path)];
  });

export const importYamlCases = (path: string) =>
  Effect.gen(function* () {
    const cases = yield* readPath(path);

    const suite: ImportedSuite = {
      source: renderYamlSuite(cases),
      tally: tallyOf(cases),
    };
    return suite;
  }).pipe(Effect.withSpan("Imports.yamlCases"));
