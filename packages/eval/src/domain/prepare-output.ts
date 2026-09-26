import { redactSecrets } from "@anpord/schema/domain/secret-text";
import { Either, Schema } from "effect";

const MARKER = "ANPORD_PREPARE_RESULT=";
const PREPARED_LIMIT = 16_000;
const SHOWN_TAIL = 400;
const CARRIED_LIMIT = PREPARED_LIMIT * 2;
const LINE_BREAK = /[\r\n]/;

const decodeJson = Schema.decodeUnknownEither(Schema.parseJson());

const decodeObject = Schema.decodeUnknownEither(
  Schema.Record({ key: Schema.String, value: Schema.Unknown })
);

export interface StreamedOutput {
  readonly stderr: string;
  readonly stdout: string;
}

export const NOTHING_STREAMED: StreamedOutput = { stderr: "", stdout: "" };

export const readPrepareValue = (
  output: string
): Either.Either<Readonly<Record<string, unknown>>, string> => {
  const line = output.split("\n").findLast((entry) => entry.startsWith(MARKER));
  if (line === undefined) {
    return Either.left("it printed no result, so its output was cut off");
  }
  const encoded = line.slice(MARKER.length);
  if (encoded.length > PREPARED_LIMIT) {
    return Either.left(
      `it returned ${encoded.length} characters and the limit is ${PREPARED_LIMIT}. Return a summary and keep large data in files`
    );
  }
  return decodeJson(encoded).pipe(
    Either.mapLeft(() => "its result was not valid JSON"),
    Either.flatMap((value) =>
      Either.mapLeft(
        decodeObject(value),
        () => "it returned something other than an object"
      )
    )
  );
};

const completeLines = (text: string) => {
  const lines = text.split(LINE_BREAK);

  return {
    carry: (lines.pop() ?? "").slice(0, CARRIED_LIMIT),
    lines: lines.filter((line) => line.trim() !== ""),
  };
};

export const shownPrepareOutput = (
  carried: StreamedOutput,
  arrived: StreamedOutput,
  known: readonly string[]
): readonly [shown: string, carried: StreamedOutput] => {
  const stdout = completeLines(carried.stdout + arrived.stdout);
  const stderr = completeLines(carried.stderr + arrived.stderr);
  const shown = redactSecrets(
    [...stdout.lines, ...stderr.lines]
      .filter((line) => !line.includes(MARKER))
      .join("\n"),
    known
  )
    .slice(-SHOWN_TAIL)
    .trim();

  return [shown, { stderr: stderr.carry, stdout: stdout.carry }];
};
