import { describe, expect, it } from "bun:test";
import { Duration, Effect, Layer, Logger, Redacted } from "effect";
import { CredentialError } from "../../src/credentials/errors";
import { CredentialResolver } from "../../src/credentials/resolver";
import { EvalStoreError, SandboxUnavailable } from "../../src/domain/errors";
import type { ReapFailure, ReapSummary } from "../../src/domain/reap-outcome";
import { SandboxProvider } from "../../src/ports/sandbox";
import {
  type LiveSandbox,
  LiveSandboxes,
} from "../../src/repositories/live-sandboxes";
import { reapSandboxes } from "../../src/services/sandbox-reaper";

const HOUR = 3_600_000;

const failingConnections: Record<string, CredentialError> = {
  "conn-deleted": new CredentialError({
    code: "not-found",
    message: "Credential connection not found",
  }),
  "conn-foreign-key": new CredentialError({
    code: "undecryptable",
    message: "Credential could not be decrypted",
  }),
  "conn-store-down": new CredentialError({
    code: "internal",
    message: "Credential store is unavailable",
  }),
};

const sandbox = (
  trialInternalId: string,
  overrides: Partial<LiveSandbox> = {}
): LiveSandbox => ({
  organizationId: "org_fake",
  provider: "daytona",
  sandboxConnectionId: null,
  sandboxId: `sbx-${trialInternalId}`,
  startedAt: new Date(Date.now() - 2 * HOUR),
  trialInternalId,
  ...overrides,
});

interface Faults {
  readonly crashing?: ReadonlySet<string>;
  readonly storeDown?: boolean;
  readonly unreachable?: ReadonlySet<string>;
}

const world = (
  rows: readonly LiveSandbox[],
  {
    crashing = new Set(),
    storeDown = false,
    unreachable = new Set(),
  }: Faults = {}
) => {
  const live = new Map(rows.map((row) => [row.trialInternalId, row]));
  const attempts: string[] = [];
  const warnings: { annotations: unknown; message: unknown }[] = [];

  const layer = Layer.mergeAll(
    Layer.succeed(
      LiveSandboxes,
      LiveSandboxes.of({
        clear: (trialInternalId) =>
          storeDown
            ? Effect.fail(
                new EvalStoreError({
                  cause: new Error("connection refused"),
                  operation: "LiveSandboxes.clear",
                })
              )
            : Effect.sync(() => {
                live.delete(trialInternalId);
              }),
        startedBefore: (cutoff) =>
          Effect.sync(() =>
            [...live.values()].filter((row) => row.startedAt < cutoff)
          ),
      })
    ),
    Layer.succeed(
      SandboxProvider,
      SandboxProvider.of({
        attach: () => Effect.die("a reaper never attaches"),
        destroy: (input) =>
          Effect.suspend(() => {
            attempts.push(input.id);
            if (crashing.has(input.id)) {
              return Effect.die(new TypeError("provider sdk crashed"));
            }
            return unreachable.has(input.id)
              ? Effect.fail(
                  new SandboxUnavailable({
                    provider: input.provider,
                    reason: "502 Bad Gateway",
                  })
                )
              : Effect.void;
          }),
        open: () => Effect.die("a reaper never opens"),
      })
    ),
    Layer.succeed(
      CredentialResolver,
      CredentialResolver.of({
        persist: () => Effect.void,
        resolve: () => Effect.die("a reaper resolves bound credentials"),
        resolveBound: (input) => {
          const failure = failingConnections[input.connectionId];
          return failure === undefined
            ? Effect.succeed(
                Redacted.make({
                  authMethodId: "api-key",
                  connectionId: input.connectionId,
                  integrationId: "daytona",
                  revision: 1,
                  values: { apiKey: "key" },
                })
              )
            : Effect.fail(failure);
        },
      })
    ),
    Logger.replace(
      Logger.defaultLogger,
      Logger.make(({ annotations, logLevel, message }) => {
        if (logLevel.label !== "DEBUG") {
          warnings.push({
            annotations: Object.fromEntries(annotations),
            message,
          });
        }
      })
    )
  );

  const sweep = () =>
    Effect.runPromise(
      reapSandboxes(Duration.minutes(90)).pipe(Effect.provide(layer))
    );

  return { attempts, live, sweep, warnings };
};

const failure = (
  outcome: ReapSummary["failures"][number]["outcome"],
  reason: ReapFailure,
  sandboxIds: readonly string[],
  count = sandboxIds.length
) => ({ count, outcome, reason, sandboxIds });

const swept = (
  counts: Partial<Omit<ReapSummary, "failures">>,
  ...failures: ReapSummary["failures"]
): ReapSummary => ({
  abandoned: 0,
  destroyed: 0,
  failures,
  gaveUp: 0,
  retrying: 0,
  ...counts,
});

describe("what a sweep does with a sandbox it cannot destroy", () => {
  it("clears a sandbox whose credential cannot be decrypted and never tries it again", async () => {
    const { attempts, live, sweep } = world([
      sandbox("trl_foreign", {
        sandboxConnectionId: "conn-foreign-key",
        sandboxId: "sbx-gpt-5",
      }),
    ]);

    const first = await sweep();
    const second = await sweep();

    expect(first).toEqual(
      swept(
        { abandoned: 1 },
        failure("abandoned", "credential-unreadable", ["sbx-gpt-5"])
      )
    );
    expect([...live.keys()]).toEqual([]);
    expect(attempts).toEqual([]);
    expect(second).toEqual(swept({}));
  });

  it("clears a sandbox whose connection was deleted or whose provider is unknown", async () => {
    const { live, sweep } = world([
      sandbox("trl_deleted", { sandboxConnectionId: "conn-deleted" }),
      sandbox("trl_floppy", { provider: "floppy" }),
    ]);

    const summary = await sweep();

    expect(summary.failures).toEqual([
      failure("abandoned", "connection-deleted", ["sbx-trl_deleted"]),
      failure("abandoned", "unknown-provider", ["sbx-trl_floppy"]),
    ]);
    expect([...live.keys()]).toEqual([]);
  });

  it("clears an unknown provider even while its credential store is down", async () => {
    const { live, sweep } = world([
      sandbox("trl_floppy_down", {
        provider: "floppy",
        sandboxConnectionId: "conn-store-down",
        sandboxId: "sbx-floppy",
      }),
    ]);

    const summary = await sweep();

    expect(summary.failures).toEqual([
      failure("abandoned", "unknown-provider", ["sbx-floppy"]),
    ]);
    expect([...live.keys()]).toEqual([]);
  });

  it("keeps a destroyed sandbox for the next sweep when its record cannot be cleared", async () => {
    const { attempts, live, sweep } = world(
      [sandbox("trl_unsaved", { sandboxId: "sbx-unsaved" })],
      { storeDown: true }
    );

    const summary = await sweep();

    expect(summary).toEqual(
      swept(
        { retrying: 1 },
        failure("retrying", "store-unavailable", ["sbx-unsaved"])
      )
    );
    expect(attempts).toEqual(["sbx-unsaved"]);
    expect([...live.keys()]).toEqual(["trl_unsaved"]);
  });

  it("retries a sandbox whose provider crashed instead of failing the sweep", async () => {
    const { live, sweep } = world(
      [
        sandbox("trl_crash", { sandboxId: "sbx-crash" }),
        sandbox("trl_fine", { sandboxId: "sbx-fine" }),
      ],
      { crashing: new Set(["sbx-crash"]) }
    );

    const summary = await sweep();

    expect(summary).toEqual(
      swept(
        { destroyed: 1, retrying: 1 },
        failure("retrying", "unexpected", ["sbx-crash"])
      )
    );
    expect([...live.keys()]).toEqual(["trl_crash"]);
  });

  it("keeps a sandbox the provider could not reach and tries it again next sweep", async () => {
    const { attempts, live, sweep } = world(
      [
        sandbox("trl_flaky", { sandboxId: "sbx-flaky" }),
        sandbox("trl_store", { sandboxConnectionId: "conn-store-down" }),
      ],
      { unreachable: new Set(["sbx-flaky"]) }
    );

    const first = await sweep();
    await sweep();

    expect(first.retrying).toBe(2);
    expect(first.failures.map(({ reason }) => reason)).toEqual([
      "provider-unavailable",
      "credential-store-unavailable",
    ]);
    expect(attempts).toEqual(["sbx-flaky", "sbx-flaky"]);
    expect([...live.keys()]).toEqual(["trl_flaky", "trl_store"]);
  });

  it("gives up on an unreachable sandbox leaked for over a day", async () => {
    const { live, sweep } = world(
      [
        sandbox("trl_ancient", {
          sandboxId: "sbx-ancient",
          startedAt: new Date(Date.now() - 25 * HOUR),
        }),
      ],
      { unreachable: new Set(["sbx-ancient"]) }
    );

    const summary = await sweep();

    expect(summary).toEqual(
      swept(
        { gaveUp: 1 },
        failure("gave-up", "provider-unavailable", ["sbx-ancient"])
      )
    );
    expect([...live.keys()]).toEqual([]);
  });

  it("logs one summary per sweep with a few sample ids instead of a warning per sandbox", async () => {
    const foreign = { sandboxConnectionId: "conn-foreign-key" };
    const { sweep, warnings } = world([
      sandbox("trl_1", { ...foreign, sandboxId: "sbx-sonnet" }),
      sandbox("trl_2", { ...foreign, sandboxId: "sbx-sonnet" }),
      sandbox("trl_3", { ...foreign, sandboxId: "sbx-model-1" }),
      sandbox("trl_4", { ...foreign, sandboxId: "sbx-model-2" }),
      sandbox("trl_5", { ...foreign, sandboxId: "sbx-model-3" }),
      sandbox("trl_6", { sandboxId: "sbx-healthy" }),
    ]);

    await sweep();

    expect(warnings).toEqual([
      {
        annotations: swept(
          { abandoned: 5, destroyed: 1 },
          failure(
            "abandoned",
            "credential-unreadable",
            ["sbx-sonnet", "sbx-model-1", "sbx-model-2"],
            5
          )
        ),
        message: ["reaped leaked sandboxes"],
      },
    ]);
  });
});
