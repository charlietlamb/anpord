import { FileSystem } from "@effect/platform";
import { Effect, ParseResult } from "effect";
import {
  CaseFileEmpty,
  CaseFileNotEvalsJson,
  CaseFileNotJson,
  CaseFileUnreadable,
} from "./evals-json-errors";
import {
  type ImportTally,
  renderEvalSuite,
  tallyOf,
} from "./evals-json-render";
import { decodeEvalsJson, type EvalsJsonFile } from "./evals-json-schema";

export interface ImportedSuite {
  readonly source: string;
  readonly tally: ImportTally;
}

const parseJson = (path: string, body: string) =>
  Effect.try({
    catch: (cause) =>
      new CaseFileNotJson({
        path,
        reason: cause instanceof Error ? cause.message : String(cause),
      }),
    try: (): unknown => JSON.parse(body),
  });

const idAt = (parsed: unknown, index: number) => {
  const found = (parsed as { readonly evals?: readonly { id?: unknown }[] })
    ?.evals?.[index];

  return found?.id === undefined ? `${index}` : String(found.id);
};

/** The case as its author sees it. A path into the decoded value tells them
 * nothing; the id is what they search the file for. */
const located = (parsed: unknown, path: readonly PropertyKey[]) => {
  const [head, index, ...rest] = path;

  if (head !== "evals" || typeof index !== "number") {
    return path.map(String).join(".");
  }

  return `case ${idAt(parsed, index)}, ${rest.map(String).join(".")}`;
};

const reasonFor = (parsed: unknown, error: ParseResult.ParseError) =>
  ParseResult.ArrayFormatter.formatError(error).pipe(
    Effect.map((issues) =>
      issues
        .map((issue) => `${located(parsed, issue.path)}: ${issue.message}`)
        .join("; ")
    )
  );

const decode = (path: string, parsed: unknown) =>
  decodeEvalsJson(parsed).pipe(
    Effect.catchTag("ParseError", (error) =>
      reasonFor(parsed, error).pipe(
        Effect.flatMap((reason) =>
          Effect.fail(new CaseFileNotEvalsJson({ path, reason }))
        )
      )
    )
  );

export const importEvalsJson = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const body = yield* fs
      .readFileString(path)
      .pipe(
        Effect.mapError((cause) => new CaseFileUnreadable({ cause, path }))
      );

    const parsed = yield* parseJson(path, body);
    const file: EvalsJsonFile = yield* decode(path, parsed);

    if (file.evals.length === 0) {
      return yield* Effect.fail(new CaseFileEmpty({ path }));
    }

    const suite: ImportedSuite = {
      source: renderEvalSuite(file),
      tally: tallyOf(file),
    };
    return suite;
  }).pipe(Effect.withSpan("Imports.evalsJson"));
