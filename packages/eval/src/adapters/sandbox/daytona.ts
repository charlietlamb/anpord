import { Daytona, DaytonaNotFoundError } from "@daytonaio/sdk";
import { Effect } from "effect";
import type { OpenSandbox, SandboxAdapterShape } from "../../ports/sandbox";
import { settingUp } from "./after-create";
import { CACHE_PATH, readyVolume } from "./daytona-cache";
import { handleFor } from "./daytona-handle";
import { HOME, unavailable } from "./daytona-shell";

/* The default snapshot gives three gigabytes and takes no resource request
   alongside it; this one is built by scripts/daytona-snapshot.ts. */
const SNAPSHOT = "anpord-eval:4";
const AUTO_DELETE_FACTOR = 6;

export const makeConfiguredDaytonaAdapter = (
  values?: Readonly<Record<string, string>>
) =>
  Effect.sync((): SandboxAdapterShape => {
    const daytona = new Daytona(
      values?.apiKey ? { apiKey: values.apiKey } : undefined
    );

    return {
      attach: (id) =>
        Effect.tryPromise({
          catch: unavailable,
          try: () => daytona.get(id),
        }).pipe(Effect.map((sandbox) => handleFor(sandbox, "/tmp/anpord"))),
      destroy: (handle) =>
        Effect.tryPromise({
          catch: (cause) => cause,
          try: async () => {
            const sandbox = await daytona.get(handle.id);
            await sandbox.delete();
          },
        }).pipe(
          Effect.catchIf(
            (cause) => cause instanceof DaytonaNotFoundError,
            () => Effect.void
          ),
          Effect.mapError(unavailable)
        ),
      open: (request: OpenSandbox) =>
        Effect.gen(function* () {
          const volumes =
            request.cache === undefined
              ? []
              : [
                  {
                    mountPath: CACHE_PATH,
                    volumeId: (yield* readyVolume(daytona, request.cache)).id,
                  },
                ];

          return yield* Effect.tryPromise({
            catch: unavailable,
            try: () =>
              daytona.create({
                autoDeleteInterval:
                  request.autoStopMinutes * AUTO_DELETE_FACTOR,
                autoStopInterval: request.autoStopMinutes,
                snapshot: SNAPSHOT,
                volumes,
              }),
          });
        }).pipe(
          Effect.flatMap((sandbox) =>
            settingUp(
              Effect.tryPromise({
                catch: unavailable,
                try: () =>
                  sandbox.process.executeCommand(
                    `mkdir -p ${request.workspace}`,
                    HOME,
                    undefined,
                    30
                  ),
              }),
              handleFor(
                sandbox,
                request.workspace,
                request.cache !== undefined
              ),
              () => sandbox.delete()
            )
          )
        ),
      provider: "daytona",
    };
  });

export const makeDaytonaAdapter = makeConfiguredDaytonaAdapter();
