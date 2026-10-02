import { CommandLine } from "@sphynx/eval/domain/command-line";
import { Schema } from "effect";

export interface RunnerEnv {
  readonly home: string;
  readonly model: string;
  readonly prompt: string;
  readonly systemPromptFile: string | undefined;
  readonly traceLog: string;
  readonly workspace: string;
}

const required = (name: string): string => {
  const value = process.env[name];

  if (value === undefined || value === "") {
    throw new Error(
      `${name} is not set. A runner script runs under the command harness, which sets it.`
    );
  }

  return value;
};

export const env = (): RunnerEnv => ({
  home: required("SPHYNX_HOME"),
  model: required("SPHYNX_MODEL"),
  prompt: required("SPHYNX_PROMPT"),
  systemPromptFile: process.env.SPHYNX_SYSTEM_PROMPT_FILE || undefined,
  traceLog: required("SPHYNX_TRACE_LOG"),
  workspace: required("SPHYNX_WORKSPACE"),
});

const UsageCountsSchema = Schema.Struct({
  cacheReadTokens: Schema.optional(Schema.NonNegativeInt),
  cacheWriteTokens: Schema.optional(Schema.NonNegativeInt),
  inputTokens: Schema.NonNegativeInt,
  outputTokens: Schema.NonNegativeInt,
});

export type UsageCounts = typeof UsageCountsSchema.Type;

const checkedCounts = Schema.decodeUnknownSync(UsageCountsSchema, {
  onExcessProperty: "error",
});

const messageUsage = (counts: UsageCounts) => {
  const checked = checkedCounts(counts);

  return {
    cacheReadTokens: checked.cacheReadTokens ?? 0,
    cacheWriteTokens: checked.cacheWriteTokens ?? 0,
    inputTokens: checked.inputTokens,
    outputTokens: checked.outputTokens,
    totalTokens: checked.inputTokens + checked.outputTokens,
  };
};

const encodeLine = Schema.encodeSync(Schema.parseJson(CommandLine));

const asText = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value);

const asOptionalText = (value: unknown): string | undefined =>
  value === undefined ? undefined : asText(value);

export interface EmitterOptions {
  readonly now?: () => number;
  readonly write?: (line: string) => void;
}

export interface ToolCallInput {
  readonly callId?: string;
  readonly error?: unknown;
  readonly input: unknown;
  readonly name: string;
  readonly output?: unknown;
  readonly status?: string;
}

export interface MessageInput {
  readonly role?: "assistant" | "user";
  readonly text: string;
  readonly usage?: UsageCounts;
}

export interface CommandInput {
  readonly command: string;
  readonly exitCode: number | null;
  readonly output: string;
}

const writeToStdout = (line: string) => {
  process.stdout.write(`${line}\n`);
};

export const createEmitter = (options: EmitterOptions = {}) => {
  const write = options.write ?? writeToStdout;
  const now = options.now ?? Date.now;
  let finished = false;

  const emit = (line: CommandLine) => {
    write(encodeLine(line));
  };

  return {
    command: ({ command, exitCode, output }: CommandInput) =>
      emit({ _tag: "Command", at: now(), command, exitCode, output }),
    fileChange: (paths: readonly string[]) =>
      emit({ _tag: "FileChange", at: now(), paths }),
    finished: (reason: string) => {
      if (finished) {
        return;
      }

      finished = true;
      emit({ _tag: "Finished", at: now(), reason });
    },
    message: ({ role = "assistant", text, usage }: MessageInput) =>
      emit({
        _tag: "Message",
        at: now(),
        role,
        text,
        usage: usage === undefined ? undefined : messageUsage(usage),
      }),
    started: ({ model, sessionId }: { model: string; sessionId: string }) =>
      emit({ _tag: "Started", at: now(), model, sessionId }),
    toolCall: ({ callId, error, input, name, output, status }: ToolCallInput) =>
      emit({
        _tag: "ToolCall",
        at: now(),
        callId: callId ?? null,
        error: asOptionalText(error),
        input: asText(input),
        name,
        output: asOptionalText(output),
        status: status ?? null,
      }),
    usage: (counts: UsageCounts) =>
      emit({ _tag: "Usage", ...checkedCounts(counts) }),
  };
};

export type Emitter = ReturnType<typeof createEmitter>;
