import { Daytona } from "@daytonaio/sdk";
import { Effect } from "effect";
import type { OpenSandbox, SandboxAdapterShape } from "../../ports/sandbox";
import { CACHE_PATH, readyVolume } from "./daytona-cache";
import { handleFor } from "./daytona-handle";
import { HOME, unavailable } from "./daytona-shell";

/* The default snapshot gives three gigabytes, which a dependency tree fills
   before an install finishes, and resources cannot be asked for alongside it.
   This one is built once by scripts/daytona-snapshot.ts and starts in about a
   second, so naming it is both larger and faster than not. */
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
          catch: unavailable,
          try: async () => {
            const sandbox = await daytona.get(handle.id);
            await sandbox.delete();
          },
        }),
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
          Effect.tap((sandbox) =>
            Effect.tryPromise({
              catch: unavailable,
              try: () =>
                sandbox.process.executeCommand(
                  `mkdir -p ${request.workspace}`,
                  HOME,
                  undefined,
                  30
                ),
            })
          ),
          Effect.map((sandbox) =>
            handleFor(sandbox, request.workspace, request.cache !== undefined)
          )
        ),
      provider: "daytona",
    };
  });

export const makeDaytonaAdapter = makeConfiguredDaytonaAdapter();
