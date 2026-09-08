import { AsyncLocalStorage } from "node:async_hooks";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { format } from "node:util";
import {
  type EvalValidation,
  unavailableValue,
  VALIDATION_ENTRY_LIMIT,
  VALIDATION_FRAME,
  type ValidationCall,
  validationCapture,
  validationExecution,
  validationSnapshot,
} from "@anpord/schema/domain/eval-validations";
import { apiContext } from "../mock-api/context";
import type { CommandResult, Validator, ValidatorContext } from "./types";
import {
  decodeCliCall,
  decodeMcpCall,
  decodePrepared,
  decodeResult,
} from "./validator-decode";

const local = new AsyncLocalStorage<{
  record: EvalValidation;
  capture: ReturnType<typeof validationCapture>;
}>();
const write = process.stdout.write.bind(process.stdout);
const emit = (record: EvalValidation) =>
  write(`${VALIDATION_FRAME}${JSON.stringify(validationSnapshot(record))}\n`);
const now = () => performance.timeOrigin + performance.now();

const observe = async <A>(
  method: ValidationCall["method"],
  input: unknown,
  run: () => Promise<A>
): Promise<A> => {
  const state = local.getStore();
  if (!state) {
    return run();
  }
  const { record, capture } = state;
  const call: ValidationCall = {
    index: record.calls.length,
    method,
    input: capture(input),
    output: unavailableValue,
    error: null,
    startedAt: now(),
    durationMs: null,
  };
  if (record.calls.length === VALIDATION_ENTRY_LIMIT) {
    state.record = { ...record, truncated: true };
    return run();
  }
  state.record = { ...record, calls: [...record.calls, call] };
  emit(state.record);
  let completed = call;
  try {
    const value = await run();
    completed = { ...call, output: capture(value) };
    return value;
  } catch (error) {
    completed = {
      ...call,
      error: capture(
        error instanceof Error ? error.stack : String(error),
        "text"
      ),
    };
    throw error;
  } finally {
    completed = {
      ...completed,
      durationMs: Math.max(0, Math.round(now() - call.startedAt)),
    };
    state.record = {
      ...state.record,
      calls: state.record.calls.map((entry) =>
        entry.index === call.index ? completed : entry
      ),
    };
    emit(state.record);
  }
};

const readOptional = async (path: string | undefined) => {
  if (path === undefined) {
    return "";
  }
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
};

const exec = (command: string) =>
  new Promise<CommandResult>((resolve, reject) => {
    const child = spawn("/bin/sh", ["-lc", command], { cwd: process.cwd() });
    let stderr = "";
    let stdout = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      resolve({ exitCode: code ?? 1, stderr, stdout })
    );
  });

const calls = async <A>(path: string, decode: (line: string) => A) => {
  const text = await readOptional(path);
  return text.trim() === "" ? [] : text.trim().split("\n").map(decode);
};

const context = (): ValidatorContext => ({
  api: {
    url: (name) => observe("api.url", [name], () => apiContext.url(name)),
    calls: (name) =>
      observe("api.calls", name === undefined ? [] : [name], () =>
        apiContext.calls(name)
      ),
  },
  answer: () =>
    observe("answer", [], () => readOptional(process.env.ANPORD_ANSWER_FILE)),
  transcript: () =>
    observe("transcript", [], () =>
      readOptional(process.env.ANPORD_TRANSCRIPT_FILE)
    ),
  prepared: decodePrepared(process.env.ANPORD_PREPARE_VALUE ?? "{}"),
  readText: (path) => observe("readText", [path], () => readFile(path, "utf8")),
  exists: (path) =>
    observe("exists", [path], () =>
      access(path).then(
        () => true,
        (error) => {
          if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
          ) {
            return false;
          }
          throw error;
        }
      )
    ),
  exec: (command) => observe("exec", [command], () => exec(command)),
  cli: {
    calls: (name) =>
      observe("cli.calls", name === undefined ? [] : [name], async () =>
        (await calls(".anpord/cli-calls.jsonl", decodeCliCall)).filter(
          (call) => name === undefined || call.cli === name
        )
      ),
  },
  mcp: {
    calls: (name) =>
      observe("mcp.calls", name === undefined ? [] : [name], async () =>
        (await calls(".anpord/mcp-calls.jsonl", decodeMcpCall)).filter(
          (call) => name === undefined || call.server === name
        )
      ),
  },
});

export const runValidators = async (
  checks: readonly { index: number; name: string; validate: Validator }[],
  capture = true
) => {
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  const log = (level: "stdout" | "stderr", values: unknown[]) => {
    const state = local.getStore();
    if (!state) {
      return original[level === "stdout" ? "log" : "error"](...values);
    }
    const record = state.record;
    state.record =
      record.logs.length === VALIDATION_ENTRY_LIMIT
        ? { ...record, truncated: true }
        : {
            ...record,
            logs: [
              ...record.logs,
              {
                index: record.logs.length,
                at: now(),
                level,
                value: state.capture(format(...values), "text"),
              },
            ],
          };
    emit(state.record);
  };
  console.log =
    console.info =
    console.debug =
      (...values) => log("stdout", values);
  console.warn = console.error = (...values) => log("stderr", values);
  let stopped = false;
  let passed = true;
  let message: string | undefined;
  try {
    for (const check of checks) {
      const started = stopped ? null : now();
      const state = {
        record: validationExecution(
          {
            id: `code:${check.index}`,
            index: check.index,
            name: check.name,
            kind: "code",
          },
          started
        ),
        capture: validationCapture(capture),
      };
      if (stopped) {
        emit({
          ...state.record,
          message: "An earlier code validator did not pass",
        });
        continue;
      }
      emit(state.record);
      await local.run(state, async () => {
        try {
          const input = context();
          state.record = {
            ...state.record,
            input: state.capture({ prepared: input.prepared }),
          };
          const raw = await check.validate(input);
          state.record = { ...state.record, output: state.capture(raw) };
          const result = decodeResult(raw);
          const verdict =
            typeof result === "boolean" ? { passed: result } : result;
          state.record = {
            ...state.record,
            status: verdict.passed ? "passed" : "failed",
            message: (verdict.message ?? "").slice(0, 2000),
            exitCode: 0,
          };
          stopped = !verdict.passed;
          passed &&= verdict.passed;
          message = verdict.message;
        } catch (error) {
          stopped = true;
          passed = false;
          process.exitCode = 1;
          state.record = {
            ...state.record,
            status: "error",
            message: "Validator threw or returned an invalid result",
            error: state.capture(
              error instanceof Error ? error.stack : String(error),
              "text"
            ),
            exitCode: 1,
          };
        } finally {
          state.record = {
            ...state.record,
            durationMs: Math.max(0, Math.round(now() - (started ?? now()))),
          };
          emit(state.record);
        }
      });
    }
    write(`ANPORD_VALIDATOR_RESULT=${JSON.stringify({ passed, message })}\n`);
  } finally {
    Object.assign(console, original);
  }
};
