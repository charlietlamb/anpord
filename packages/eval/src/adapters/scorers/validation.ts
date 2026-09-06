import {
  EvalValidation,
  VALIDATION_FRAME,
  VALIDATION_TEXT_LIMIT,
  validationSnapshot,
} from "@anpord/schema/domain/eval-validations";
import { Effect, Option, Schema, Stream } from "effect";
import type { ExecOptions, SandboxHandle } from "../../ports/sandbox";
import type { ValidationObserver } from "../../ports/scorer";

const decode = Schema.decodeUnknownOption(Schema.parseJson(EvalValidation), {
  onExcessProperty: "error",
});
const MAX_FRAME = 512_000;

export const publishValidation = (
  record: EvalValidation,
  observe?: ValidationObserver
) => observe?.(validationSnapshot(record)) ?? Effect.void;

export const executeValidation = (input: {
  sandbox: SandboxHandle;
  command: string;
  options: ExecOptions;
  records: readonly EvalValidation[];
  observe?: ValidationObserver;
  prefix?: string;
}) =>
  Effect.gen(function* () {
    const records = new Map(input.records.map((record) => [record.id, record]));
    for (const record of records.values()) {
      yield* publishValidation(record, input.observe);
    }
    let pending = "";
    let stdout = "";
    let stderr = "";
    let exitCode: number | null = null;
    let invalid = false;
    let rawTruncated = false;

    const line = (text: string) =>
      Effect.gen(function* () {
        if (text.length > MAX_FRAME) {
          invalid = true;
          return;
        }
        if (
          !text.startsWith(VALIDATION_FRAME) ||
          input.records.every((record) => record.kind === "command")
        ) {
          rawTruncated ||=
            stdout.length + text.length + 1 > VALIDATION_TEXT_LIMIT;
          stdout = `${stdout}${text}\n`.slice(-VALIDATION_TEXT_LIMIT);
          return;
        }
        const decoded = decode(text.slice(VALIDATION_FRAME.length));
        if (Option.isNone(decoded)) {
          invalid = true;
          return;
        }
        const record = {
          ...decoded.value,
          id: `${input.prefix ?? ""}${decoded.value.id}`,
        };
        const previous = records.get(record.id);
        if (
          !previous ||
          previous.index !== record.index ||
          previous.kind !== record.kind ||
          previous.name !== record.name
        ) {
          invalid = true;
          return;
        }
        records.set(record.id, record);
        yield* publishValidation(record, input.observe);
      });

    const result = yield* input.sandbox.exec(input.command, input.options).pipe(
      Stream.runForEach((chunk) =>
        Effect.gen(function* () {
          if (chunk.stream === "exit") {
            exitCode = chunk.exitCode;
            return;
          }
          if (chunk.stream === "stderr") {
            rawTruncated ||=
              stderr.length + chunk.data.length > VALIDATION_TEXT_LIMIT;
            stderr = `${stderr}${chunk.data}`.slice(0, VALIDATION_TEXT_LIMIT);
            return;
          }
          pending += chunk.data;
          const lines = pending.split("\n");
          pending = lines.pop() ?? "";
          for (const text of lines) {
            yield* line(text);
          }
          if (pending.length > MAX_FRAME) {
            pending = "";
            invalid = true;
          }
        })
      ),
      Effect.exit
    );
    if (pending) {
      yield* line(pending);
    }
    return {
      records: [...records.values()],
      exitCode,
      stdout,
      stderr,
      rawTruncated,
      invalid,
      interrupted: result._tag === "Failure",
    };
  });
