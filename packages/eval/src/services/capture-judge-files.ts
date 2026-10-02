import { Effect, Stream } from "effect";
import { shellQuote } from "../adapters/harness/process";
import { SandboxUnavailable } from "../domain/errors";
import {
  JUDGE_FILE_LIMIT,
  JUDGE_FILES_LIMIT,
  type JudgeFile,
} from "../domain/judge-files";
import type { SandboxHandle } from "../ports/sandbox";

const MAX_UTF8_BYTES = JUDGE_FILE_LIMIT * 4;

const readCommand = (path: string) => {
  const file = shellQuote(`./${path}`);
  return `if [ -f ${file} ]; then echo found; head -c ${MAX_UTF8_BYTES + 1} ${file} | base64; else echo missing; fi`;
};

const fileOf = (path: string, stdout: string): JudgeFile => {
  const [marker, ...encoded] = stdout.split("\n");
  if (marker !== "found") {
    return { kind: "missing", path };
  }
  const bytes = Buffer.from(encoded.join(""), "base64");
  const text = bytes.toString("utf8");
  return bytes.length > MAX_UTF8_BYTES || text.length > JUDGE_FILE_LIMIT
    ? { kind: "oversized", path, limit: "file" }
    : { kind: "read", path, text };
};

const readFile = (
  sandbox: Pick<SandboxHandle, "exec" | "provider">,
  workspace: string,
  path: string
) =>
  sandbox.exec(readCommand(path), { cwd: workspace, timeoutMs: 30_000 }).pipe(
    Stream.runFold({ exitCode: -1, stdout: "" }, (read, chunk) => {
      if (chunk.stream === "exit") {
        return { ...read, exitCode: chunk.exitCode };
      }
      return chunk.stream === "stdout"
        ? { ...read, stdout: read.stdout + chunk.data }
        : read;
    }),
    Effect.flatMap(({ exitCode, stdout }) =>
      exitCode === 0
        ? Effect.succeed(fileOf(path, stdout))
        : Effect.fail(
            new SandboxUnavailable({
              provider: sandbox.provider,
              reason: `Judge file ${path} could not be read`,
            })
          )
    )
  );

const withinTotal = (files: readonly JudgeFile[]) => {
  let total = 0;
  return files.map((file): JudgeFile => {
    if (file.kind !== "read") {
      return file;
    }
    if (total + file.text.length > JUDGE_FILES_LIMIT) {
      return { kind: "oversized", path: file.path, limit: "total" };
    }
    total += file.text.length;
    return file;
  });
};

export const captureJudgeFiles = (
  sandbox: Pick<SandboxHandle, "exec" | "provider">,
  workspace: string,
  paths: readonly string[]
) =>
  Effect.forEach(paths, (path) => readFile(sandbox, workspace, path), {
    concurrency: 8,
  }).pipe(
    Effect.map(withinTotal),
    Effect.withSpan("JudgeFiles.capture", {
      attributes: { files: paths.length },
    })
  );
