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

/**
 * Both streams are kept apart rather than merged. Which stream a line arrived
 * on is the thing several checks are about: results belong on stdout so they
 * can be piped, and status messages belong on stderr so they do not corrupt
 * what was piped.
 */
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

/** The output of a failed command is the only useful thing about it, so a
 * caller never has to remember to attach it to the message. */
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
