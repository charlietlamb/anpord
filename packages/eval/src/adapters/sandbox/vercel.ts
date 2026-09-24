import { dirname } from "node:path";
import { Writable } from "node:stream";
import type { CredentialValues } from "@anpord/schema/domain/credentials";
import { Sandbox } from "@vercel/sandbox";
import { Config, Effect, Option } from "effect";
import {
  type SandboxUnavailable,
  sandboxUnavailable,
} from "../../domain/errors";
import type { SandboxHandle } from "../../ports/sandbox";
import { execStream } from "./exec-stream";
import {
  DEFAULT_TIMEOUT_MS,
  type MakeAdapter,
  providerAdapter,
  providerCall,
} from "./provider-adapter";

const HOME = "/vercel";

const call = providerCall("vercel");

const optional = (name: string) =>
  Config.string(name).pipe(Config.withDefault(""));

const environment = Config.all({
  oidcToken: optional("VERCEL_OIDC_TOKEN"),
  projectId: optional("VERCEL_PROJECT_ID"),
  teamId: optional("VERCEL_TEAM_ID"),
  token: optional("VERCEL_TOKEN"),
});

type Environment = Config.Config.Success<typeof environment>;

interface Credentials {
  readonly projectId?: string;
  readonly teamId?: string;
  readonly token?: string;
}

const credentials = (
  values: CredentialValues | undefined,
  env: Environment
): Effect.Effect<Credentials, SandboxUnavailable> => {
  if (values?.token && values.teamId && values.projectId) {
    return Effect.succeed({
      projectId: values.projectId,
      teamId: values.teamId,
      token: values.token,
    });
  }

  const { projectId, teamId, token } = env;
  const configured = [projectId, teamId, token].filter(Boolean).length;

  if (env.oidcToken || configured === 0) {
    return Effect.succeed({});
  }

  return configured === 3
    ? Effect.succeed({ projectId, teamId, token })
    : Effect.fail(
        sandboxUnavailable(
          "vercel",
          "VERCEL_TOKEN, VERCEL_TEAM_ID, and VERCEL_PROJECT_ID must be set together"
        )
      );
};

const writable = (write: (data: string) => void) =>
  new Writable({
    write(chunk, _encoding, done) {
      write(Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk));
      done();
    },
  });

const handleFor = (sandbox: Sandbox, workspace: string): SandboxHandle => ({
  cache: Option.none(),
  exec: (command, options) =>
    execStream((sink) =>
      call(() =>
        sandbox.runCommand({
          args: ["-lc", command],
          cmd: "bash",
          cwd: options?.cwd ?? workspace,
          env: options?.env && { ...options.env },
          stderr: writable(sink.stderr),
          stdout: writable(sink.stdout),
          timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        })
      ).pipe(Effect.map((result) => result.exitCode))
    ),
  home: HOME,
  id: sandbox.name,
  provider: "vercel",
  resumable: Option.none(),
  writeFile: (path, content) =>
    call(async () => {
      await sandbox.fs.mkdir(dirname(path), { recursive: true });
      await sandbox.fs.writeFile(path, content);
    }),
});

export const vercelAdapter: MakeAdapter = (values) =>
  Effect.gen(function* () {
    const auth = credentials(values, yield* environment);

    return providerAdapter({
      connect: (id) =>
        auth.pipe(
          Effect.flatMap((found) =>
            call(() => Sandbox.get({ ...found, name: id, resume: true }))
          )
        ),
      create: (request) =>
        auth.pipe(
          Effect.flatMap((found) =>
            call(() =>
              Sandbox.create({
                ...found,
                image: "vercel/sandbox/universal:latest",
                persistent: false,
                tags: { purpose: "eval", service: "anpord" },
                timeout: request.autoStopMinutes * 60_000,
              })
            )
          )
        ),
      destroy: (id) =>
        auth.pipe(
          Effect.flatMap((found) =>
            call(async () => {
              const sandbox = await Sandbox.get({ ...found, name: id });
              await sandbox.delete();
            })
          )
        ),
      discard: (sandbox) => call(() => sandbox.delete()),
      handleFor,
      home: HOME,
      makeWorkspace: (sandbox, workspace) =>
        call(() => sandbox.fs.mkdir(workspace, { recursive: true })),
      provider: "vercel",
    });
  }).pipe(Effect.orDie);
