import { spawn } from "node:child_process";
import { join } from "node:path";
import { runOrThrow } from "@anpord/e2e/src/harness/process";

const BOOT_TIMEOUT_MS = 30_000;
const POLL_MS = 50;

export interface RunningWeb {
  readonly baseUrl: string;
  readonly stop: () => Promise<void>;
}

const webEnv = (serverUrl: string, port: number) => {
  const { REDIS_URL, ...inherited } = process.env;
  return {
    ...inherited,
    AUTH_SERVER_URL: serverUrl,
    BETTER_AUTH_URL: serverUrl,
    HOST: "127.0.0.1",
    NODE_ENV: "production",
    PORT: String(port),
    VITE_POSTHOG_KEY: "",
  };
};

export const buildWeb = async (repositoryRoot: string, serverUrl: string) => {
  const began = performance.now();
  await runOrThrow("Could not build apps/web", "bun", ["run", "build"], {
    cwd: join(repositoryRoot, "apps/web"),
    env: webEnv(serverUrl, 0),
  });
  return performance.now() - began;
};

const answers = async (url: string) => {
  try {
    const response = await fetch(url, { redirect: "manual" });
    await response.arrayBuffer();
    return true;
  } catch {
    return false;
  }
};

export const startWeb = async (
  repositoryRoot: string,
  serverUrl: string,
  port: number
): Promise<RunningWeb> => {
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn("node", [".output/server/index.mjs"], {
    cwd: join(repositoryRoot, "apps/web"),
    env: webEnv(serverUrl, port),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const collect = (chunk: unknown) => {
    output = `${output}${String(chunk)}`.slice(-8000);
  };
  child.stdout?.on("data", collect);
  child.stderr?.on("data", collect);
  const exited = new Promise<void>((resolve) =>
    child.once("exit", () => resolve())
  );
  const stop = async () => {
    if (child.exitCode === null) {
      child.kill("SIGKILL");
      await exited;
    }
  };

  const began = performance.now();
  while (!(await answers(`${baseUrl}/login`))) {
    if (
      child.exitCode !== null ||
      performance.now() - began > BOOT_TIMEOUT_MS
    ) {
      await stop();
      throw new Error(`The web server did not start:\n${output}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return { baseUrl, stop };
};
