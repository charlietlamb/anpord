import { Daytona } from "@daytonaio/sdk";
import { Sandbox as E2BSandbox } from "e2b";

export interface Ran {
  readonly command: string;
  readonly durationMs: number;
  readonly exitCode: number;
  readonly stdout: string;
}

export interface Box {
  readonly id: string;
  readonly provider: "e2b" | "daytona";
  readonly run: (command: string, timeoutMs?: number) => Promise<Ran>;
  readonly stop: () => Promise<void>;
  readonly write: (path: string, content: string) => Promise<void>;
}

/** Seconds on Daytona, milliseconds on E2B. Named once so the two adapters
 * cannot disagree about how long a command is allowed to take. */
const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Daytona resolves the working directory before spawning, so a command whose
 * cwd does not exist yet fails to start rather than failing to run: the runner
 * reports `fork/exec /usr/bin/zsh: no such file or directory` with exit -1, and
 * nothing executes. Every command is therefore run from a directory known to
 * exist, and the working directory is changed inside the command instead.
 */
const cdInto = (workspace: string, command: string) =>
  `cd ${workspace} 2>/dev/null || true; ${command}`;

/**
 * Both harnesses are scored from this journal rather than from their own
 * reporting, because Codex records exit codes and Claude Code does not, and
 * scoring each by its own instrument would measure two different things.
 */
export const openE2B = async (workspace: string): Promise<Box> => {
  const sandbox = await E2BSandbox.create({ timeoutMs: 15 * 60 * 1000 });
  await sandbox.commands.run(`mkdir -p ${workspace}`);

  return {
    id: sandbox.sandboxId,
    provider: "e2b",
    run: async (command, timeoutMs = DEFAULT_TIMEOUT_MS) => {
      const started = Date.now();
      const result = await sandbox.commands
        .run(command, { cwd: workspace, timeoutMs })
        .catch(
          (cause: { exitCode?: number; stdout?: string; stderr?: string }) => ({
            exitCode: cause.exitCode ?? 1,
            stderr: cause.stderr ?? "",
            stdout: cause.stdout ?? "",
          })
        );

      return {
        command,
        durationMs: Date.now() - started,
        exitCode: result.exitCode,
        stdout: `${result.stdout}${result.stderr}`.slice(0, 4000),
      };
    },
    stop: () => sandbox.kill().then(() => undefined),
    write: (path, content) =>
      sandbox.files.write(path, content).then(() => undefined),
  };
};

export const openDaytona = async (workspace: string): Promise<Box> => {
  const daytona = new Daytona();
  const sandbox = await daytona.create();

  const exec = (command: string, timeoutMs: number) =>
    sandbox.process
      .executeCommand(
        command,
        "/home/daytona",
        undefined,
        Math.ceil(timeoutMs / 1000)
      )
      .catch((cause: { exitCode?: number; result?: string }) => ({
        exitCode: cause.exitCode ?? 1,
        result: cause.result ?? String(cause),
      }));

  await exec(`mkdir -p ${workspace}`, 30_000);

  return {
    id: sandbox.id,
    provider: "daytona",
    run: async (command, timeoutMs = DEFAULT_TIMEOUT_MS) => {
      const started = Date.now();
      const result = await exec(cdInto(workspace, command), timeoutMs);

      return {
        command,
        durationMs: Date.now() - started,
        exitCode: result.exitCode ?? 0,
        stdout: (result.result ?? "").slice(0, 4000),
      };
    },
    stop: () => sandbox.delete().then(() => undefined),
    write: async (path, content) => {
      /* No files API parity worth relying on, and a heredoc keeps the content
         intact where an echo would eat backslashes and quotes. */
      const marker = "ANPORD_EOF";
      await exec(
        `mkdir -p "$(dirname ${path})" && cat > ${path} <<'${marker}'\n${content}\n${marker}`,
        30_000
      );
    },
  };
};
