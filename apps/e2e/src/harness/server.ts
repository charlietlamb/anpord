import { spawn } from "node:child_process";
import { join } from "node:path";
import { AUTH_SECRET } from "./settings";

const READY = "server listening on";
const BOOT_TIMEOUT_MS = 45_000;
const POLL_MS = 100;

export interface RunningServer {
  readonly baseUrl: string;
  readonly output: () => string;
  readonly stop: () => void;
}

/**
 * A run killed part way through, or a server started by hand against this
 * cluster, leaves the port held. The port belongs to the tests, so reclaiming
 * it is safer than asking a developer to hunt down the process.
 */
const reclaimPort = (port: number) =>
  new Promise<void>((resolve) => {
    const kill = spawn("sh", ["-c", `lsof -ti:${port} | xargs kill -9`]);
    kill.on("close", () => setTimeout(resolve, 300));
  });

/**
 * The real server binary rather than an in-process handler, so a run exercises
 * routing, authentication, and encoding exactly as a deployment does.
 */
export const startServer = async (
  repositoryRoot: string,
  databaseUrl: string,
  port: number
): Promise<RunningServer> => {
  await reclaimPort(port);

  /** An empty REDIS_URL still reads as a url and sends the server retrying
   * against nothing, so the variable is removed rather than blanked. */
  const { REDIS_URL, ...inherited } = process.env;

  const child = spawn("bun", ["run", "src/server.ts"], {
    cwd: join(repositoryRoot, "apps/server"),
    env: {
      ...inherited,
      AUTH_TRUSTED_ORIGINS: `http://127.0.0.1:${port}`,
      BETTER_AUTH_SECRET: AUTH_SECRET,
      BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
      DATABASE_URL: databaseUrl,
      HOST: "127.0.0.1",
      PORT: String(port),
    },
  });

  let output = "";
  const collect = (chunk: unknown) => {
    output += String(chunk);
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);

  const server: RunningServer = {
    baseUrl: `http://127.0.0.1:${port}`,
    output: () => output,
    stop: () => child.kill("SIGKILL"),
  };

  const deadline = Date.now() + BOOT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (output.includes(READY)) {
      return server;
    }

    if (child.exitCode !== null) {
      throw new Error(`The server exited while starting:\n${output}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  server.stop();
  throw new Error(`The server did not start within 45s:\n${output}`);
};
