import {
  EvalValidation,
  VALIDATION_FRAME,
  VALIDATION_TEXT_LIMIT,
  validationSnapshot,
} from "@anpord/schema/domain/eval-validations";
import { Effect, Exit, Option, Ref, Schema, Stream } from "effect";
import type { ExecOptions, SandboxHandle } from "../../ports/sandbox";
import type { ValidationObserver } from "../../ports/scorer";
import { type ExecLine, execLines } from "../harness/process";

const decode = Schema.decodeUnknownOption(Schema.parseJson(EvalValidation), {
  onExcessProperty: "error",
});

const MAX_FRAME = 512_000;

interface ExecutionState {
  readonly exitCode: number | null;
  readonly invalid: boolean;
  readonly rawTruncated: boolean;
  readonly records: ReadonlyMap<string, EvalValidation>;
  readonly stderr: string;
  readonly stdout: string;
}

export const publishValidation = (
  record: EvalValidation,
  observe?: ValidationObserver
) => observe?.(validationSnapshot(record)) ?? Effect.void;

const frameOf = (
  text: string,
  records: ReadonlyMap<string, EvalValidation>,
  prefix: string
) =>
  decode(text.slice(VALIDATION_FRAME.length)).pipe(
    Option.map((decoded) => ({ ...decoded, id: `${prefix}${decoded.id}` })),
    Option.filter((record) => {
      const previous = records.get(record.id);
      return (
        previous !== undefined &&
        previous.index === record.index &&
        previous.kind === record.kind &&
        previous.name === record.name
      );
    })
  );

const withText = (state: ExecutionState, text: string): ExecutionState => ({
  ...state,
  rawTruncated:
    state.rawTruncated ||
    state.stdout.length + text.length + 1 > VALIDATION_TEXT_LIMIT,
  stdout: `${state.stdout}${text}\n`.slice(-VALIDATION_TEXT_LIMIT),
});

const withStderr = (state: ExecutionState, data: string): ExecutionState => ({
  ...state,
  rawTruncated:
    state.rawTruncated ||
    state.stderr.length + data.length > VALIDATION_TEXT_LIMIT,
  stderr: `${state.stderr}${data}`.slice(0, VALIDATION_TEXT_LIMIT),
});

export const executeValidation = (input: {
  sandbox: SandboxHandle;
  command: string;
  options: ExecOptions;
  records: readonly EvalValidation[];
  observe?: ValidationObserver;
  prefix?: string;
}) =>
  Effect.gen(function* () {
    yield* Effect.forEach(
      input.records,
      (record) => publishValidation(record, input.observe),
      { discard: true }
    );

    const framed = input.records.some((record) => record.kind !== "command");
    const state = yield* Ref.make<ExecutionState>({
      exitCode: null,
      invalid: false,
      rawTruncated: false,
      records: new Map(input.records.map((record) => [record.id, record])),
      stderr: "",
      stdout: "",
    });

    const onLine = (text: string) =>
      Effect.gen(function* () {
        const current = yield* Ref.get(state);

        if (text.length > MAX_FRAME) {
          return yield* Ref.set(state, { ...current, invalid: true });
        }

        if (!(framed && text.startsWith(VALIDATION_FRAME))) {
          return yield* Ref.set(state, withText(current, text));
        }

        const record = frameOf(text, current.records, input.prefix ?? "");

        if (Option.isNone(record)) {
          return yield* Ref.set(state, { ...current, invalid: true });
        }

        yield* Ref.set(state, {
          ...current,
          records: new Map(current.records).set(record.value.id, record.value),
        });
        yield* publishValidation(record.value, input.observe);
      });

    const onOutput = (output: ExecLine) => {
      switch (output._tag) {
        case "line":
          return onLine(output.line);
        case "stderr":
          return Ref.update(state, (current) =>
            withStderr(current, output.data)
          );
        default:
          return Ref.update(state, (current) => ({
            ...current,
            exitCode: output.exitCode,
          }));
      }
    };

    const result = yield* execLines(
      input.sandbox.exec(input.command, input.options)
    ).pipe(Stream.runForEach(onOutput), Effect.exit);
    const { records, ...final } = yield* Ref.get(state);

    return {
      ...final,
      interrupted: Exit.isFailure(result),
      records: [...records.values()],
    };
  });
