import { dirname } from "node:path";
import { Writable } from "node:stream";
import { Sandbox } from "@vercel/sandbox";
import { Config, Effect } from "effect";
import { sandboxUnavailable } from "../../domain/errors";
import type {
  ExecOptions,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";
import { settingUp } from "./after-create";
import { noCache, noResumableCommands } from "./capabilities";
import { execStream } from "./exec-stream";

const DEFAULT_TIMEOUT_MS = 120_000;
const HOME = "/vercel";
const WORKSPACE = "/vercel/sandbox";

interface Environment {
  readonly oidcToken: string;
  readonly projectId: string;
  readonly teamId: string;
  readonly token: string;
}

const environment = Config.all({
  oidcToken: Config.string("VERCEL_OIDC_TOKEN").pipe(Config.withDefault("")),
  projectId: Config.string("VERCEL_PROJECT_ID").pipe(Config.withDefault("")),
  teamId: Config.string("VERCEL_TEAM_ID").pipe(Config.withDefault("")),
  token: Config.string("VERCEL_TOKEN").pipe(Config.withDefault("")),
});

const unavailable = (reason: unknown) => sandboxUnavailable("vercel", reason);

const credentials = (
  values: Readonly<Record<string, string>> | undefined,
  env: Environment
) => {
  if (values?.token && values.teamId && values.projectId) {
    return {
      projectId: values.projectId,
      teamId: values.teamId,
      token: values.token,
    };
  }

  if (env.oidcToken) {
    return {};
  }

  const { projectId, teamId, token } = env;
  const configured = [projectId, teamId, token].filter(Boolean).length;

  if (configured === 0) {
    return {};
  }
  if (configured !== 3) {
    throw new Error(
      "VERCEL_TOKEN, VERCEL_TEAM_ID, and VERCEL_PROJECT_ID must be set together"
    );
  }
  return {
    projectId: projectId as string,
    teamId: teamId as string,
    token: token as string,
  };
};

const writable = (write: (data: string) => void) =>
  new Writable({
    write(chunk, _encoding, done) {
      write(Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk));
      done();
    },
  });

const handleFor = (sandbox: Sandbox, workspace: string): SandboxHandle => ({
  cache: noCache,
  exec: (command, options?: ExecOptions) =>
    execStream((sink) =>
      Effect.tryPromise({
        catch: unavailable,
        try: async () => {
          const result = await sandbox.runCommand({
            args: ["-lc", command],
            cmd: "bash",
            cwd: options?.cwd ?? workspace,
            env: options?.env ? { ...options.env } : undefined,
            stderr: writable(sink.stderr),
            stdout: writable(sink.stdout),
            timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          });
          return result.exitCode;
        },
      })
    ),
  home: HOME,
  id: sandbox.name,
  provider: "vercel",
  resumable: noResumableCommands,
  writeFile: (path, content) =>
    Effect.tryPromise({
      catch: unavailable,
      try: async () => {
        await sandbox.fs.mkdir(dirname(path), { recursive: true });
        await sandbox.fs.writeFile(path, content);
      },
    }),
});

export const makeConfiguredVercelAdapter = (
  values?: Readonly<Record<string, string>>
) =>
  Effect.gen(function* () {
    const env = yield* environment;
    return {
      attach: (id) =>
        Effect.tryPromise({
          catch: unavailable,
          try: () =>
            Sandbox.get({
              ...credentials(values, env),
              name: id,
              resume: true,
            }),
        }).pipe(Effect.map((sandbox) => handleFor(sandbox, WORKSPACE))),
      destroy: (handle) =>
        Effect.tryPromise({
          catch: unavailable,
          try: async () => {
            const sandbox = await Sandbox.get({
              ...credentials(values, env),
              name: handle.id,
            });
            await sandbox.delete();
          },
        }),
      open: (request: OpenSandbox) =>
        Effect.tryPromise({
          catch: unavailable,
          try: () =>
            Sandbox.create({
              ...credentials(values, env),
              image: "vercel/sandbox/universal:latest",
              persistent: false,
              tags: { purpose: "eval", service: "anpord" },
              timeout: request.autoStopMinutes * 60_000,
            }),
        }).pipe(
          Effect.flatMap((sandbox) =>
            settingUp(
              Effect.tryPromise({
                catch: unavailable,
                try: () =>
                  sandbox.fs.mkdir(request.workspace, { recursive: true }),
              }),
              handleFor(sandbox, request.workspace),
              () => sandbox.delete()
            )
          )
        ),
      provider: "vercel",
    } satisfies SandboxAdapterShape;
  }).pipe(Effect.orDie);

export const makeVercelAdapter = makeConfiguredVercelAdapter();
