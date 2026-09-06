import { spawn } from "node:child_process";

export interface ProcessResult {
  readonly code: number;
  readonly stderr: string;
  readonly stdout: string;
}

export interface ProcessOptions {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly stdin?: string;
}

/* Streams stay apart: scenarios assert that results go to stdout and status messages to stderr, so merging them would hide the bug. */
export const runProcess = (
  command: string,
  args: readonly string[],
  options: ProcessOptions = {}
) =>
  new Promise<ProcessResult>((resolve) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: options.env,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    if (options.stdin !== undefined) {
      child.stdin.write(options.stdin);
    }
    child.stdin.end();

    child.on("close", (code) => resolve({ code: code ?? 1, stderr, stdout }));
  });

export const runOrThrow = async (
  describe: string,
  command: string,
  args: readonly string[],
  options: ProcessOptions = {}
) => {
  const result = await runProcess(command, args, options);

  if (result.code !== 0) {
    throw new Error(
      `${describe} (exit ${result.code}):\n${result.stdout}${result.stderr}`
    );
  }

  return result;
};
