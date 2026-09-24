import type { Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Clock, Effect, Random } from "effect";
import type { ExecOptions } from "../../ports/sandbox";
import { shellQuote } from "../harness/process";
import { envFileFor, sourcing } from "./env-file";
import { providerCall, unavailableFor } from "./provider-adapter";

export const HOME = "/home/daytona";

export const call = providerCall("daytona");
export const unavailable = unavailableFor("daytona");

const cdInto = (workspace: string, command: string) =>
  `cd ${shellQuote(workspace)} && ${command}`;

export const sessionName = Effect.gen(function* () {
  const at = yield* Clock.currentTimeMillis;
  const salt = yield* Random.nextIntBetween(0, 1_000_000);

  return `anpord-${at}-${salt}`;
});

export const startSessionCommand = (
  sandbox: DaytonaSandbox,
  workspace: string,
  sessionId: string,
  command: string,
  options?: ExecOptions
) =>
  Effect.gen(function* () {
    const envFile = yield* envFileFor(options?.env);

    if (envFile !== null) {
      yield* call(() =>
        sandbox.fs.uploadFile(Buffer.from(envFile.contents), envFile.path)
      );
    }

    const started = yield* call(() =>
      sandbox.process.executeSessionCommand(sessionId, {
        command: cdInto(options?.cwd ?? workspace, sourcing(envFile, command)),
        runAsync: true,
      })
    );

    return started.cmdId ?? "";
  });
