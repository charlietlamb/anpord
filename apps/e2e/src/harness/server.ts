import { spawn } from "node:child_process";
import { join } from "node:path";
import { runProcess } from "./process";
import { AUTH_SECRET } from "./settings";
import { waitUntil } from "./wait";

const READY = "server listening on";
const BOOT_TIMEOUT_MS = 45_000;
/** The kill returns before the kernel releases the socket, and how long that
 * takes depends on the machine, so the port is watched rather than guessed at
 * with a sleep long enough to look safe. */
const PORT_RELEASE_TIMEOUT_MS = 5000;

export interface RunningServer {
  readonly baseUrl: string;
  readonly stop: () => void;
}

const portIsFree = async (port: number) =>
  (await runProcess("lsof", ["-ti", `:${port}`])).stdout.trim().length === 0;

/**
 * A run killed part way through, or a server started by hand against this
 * cluster, leaves the port held. The port belongs to the tests, so reclaiming
 * it is safer than asking a developer to hunt down the process.
 */
const reclaimPort = async (port: number) => {
  if (await portIsFree(port)) {
    return;
  }

  await runProcess("sh", ["-c", `lsof -ti:${port} | xargs kill -9`]);

  await waitUntil(async () => await portIsFree(port), {
    describe: `port ${port} becoming free`,
    timeoutMs: PORT_RELEASE_TIMEOUT_MS,
  });
};

/**
 * The real server binary rather than an in-process handler, so a run exercises
 * routing, authentication, and encoding exactly as a deployment does.
 *
 * REDIS_URL is removed rather than blanked: an empty value still reads as a
 * url and sends the server retrying against nothing.
 */
export const startServer = async (
  repositoryRoot: string,
  databaseUrl: string,
  port: number
): Promise<RunningServer> => {
  await reclaimPort(port);

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

  const stop = () => child.kill("SIGKILL");

  try {
    await waitUntil(() => output.includes(READY), {
      describe: "the server starting",
      failed: () =>
        child.exitCode === null
          ? undefined
          : `The server exited while starting:\n${output}`,
      timeoutMs: BOOT_TIMEOUT_MS,
    });
  } catch (cause) {
    stop();
    throw new Error(`${(cause as Error).message}\n${output}`);
  }

  return { baseUrl: `http://127.0.0.1:${port}`, stop };
};
