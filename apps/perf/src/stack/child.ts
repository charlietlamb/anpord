import { type ChildProcess, spawn } from "node:child_process";

const READY_POLL_MS = 20;
const OUTPUT_TAIL = 20_000;

interface ChildOptions {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly failure: string;
  readonly ready: (status: number) => boolean;
  readonly readyUrl: string;
  readonly timeoutMs: number;
}

export const localUrl = (port: number) => `http://127.0.0.1:${port}`;

const answers = async (options: ChildOptions, remainingMs: number) => {
  try {
    const response = await fetch(options.readyUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(Math.max(1, remainingMs)),
    });
    await response.arrayBuffer();
    return options.ready(response.status);
  } catch {
    return false;
  }
};

const spawnChild = (options: ChildOptions): ChildProcess => {
  const { REDIS_URL, ...inherited } = process.env;
  try {
    return spawn(options.command, options.args, {
      cwd: options.cwd,
      env: { ...inherited, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (cause) {
    throw new Error(`${options.failure}:\n${String(cause)}`);
  }
};

export const spawnUntilReady = async (options: ChildOptions) => {
  const began = performance.now();
  const child = spawnChild(options);
  let output = "";
  let spawnFailed = false;
  const collect = (chunk: unknown) => {
    output = `${output}${String(chunk)}`.slice(-OUTPUT_TAIL);
  };
  child.stdout?.on("data", collect);
  child.stderr?.on("data", collect);
  const exited = new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    child.once("error", (cause) => {
      spawnFailed = true;
      collect(cause);
      resolve();
    });
  });
  const running = () =>
    !spawnFailed && child.exitCode === null && child.signalCode === null;
  const stop = async () => {
    if (running()) {
      child.kill("SIGKILL");
      await exited;
    }
  };
  const elapsed = () => performance.now() - began;

  for (;;) {
    const ready = await answers(options, options.timeoutMs - elapsed());
    if (ready && running()) {
      return { readyMs: elapsed(), stop };
    }
    if (!running() || elapsed() > options.timeoutMs) {
      await stop();
      throw new Error(`${options.failure}:\n${output}`);
    }
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
  }
};
