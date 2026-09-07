import { describe, expect, it } from "bun:test";
import { Effect, Option, Redacted } from "effect";
import type { CredentialResolverShape } from "../../src/credentials/resolver";
import type { HarnessDriverShape } from "../../src/ports/harness";
import type { SandboxHandle } from "../../src/ports/sandbox";
import { captureCredentialRotation } from "../../src/services/credential-rotation";

const sandbox = {} as SandboxHandle;

const credential = Redacted.make({
  authMethodId: "chatgpt",
  connectionId: "ccn_1",
  integrationId: "codex",
  revision: 1,
  values: { authJson: '{"tokens":{"refresh_token":"old"}}' },
});

const recording = () => {
  const written: Record<string, string>[] = [];

  const credentials: CredentialResolverShape = {
    persist: (input) =>
      Effect.sync(() => {
        written.push({ ...input.values });
      }),
    resolve: () => Effect.die("unused"),
    resolveBound: () => Effect.die("unused"),
  };

  return { credentials, written };
};

const driverReturning = (
  rotated: Option.Option<Record<string, string>>
): HarnessDriverShape => ({
  captureRotation: () => Effect.succeed(rotated),
  harness: "codex",
  prepare: () => Effect.succeed({}),
  run: () => Effect.die("unused"),
});

const capture = (
  driver: HarnessDriverShape,
  credentials: CredentialResolverShape
) =>
  Effect.runPromise(
    captureCredentialRotation({
      credential,
      credentials,
      driver,
      home: "/home/user",
      organizationId: "org_1",
      profile: Option.none(),
      sandbox,
      version: "1.0.0",
    })
  );

describe("capturing a credential the harness rotated", () => {
  it("stores the refreshed material against the connection", async () => {
    const { credentials, written } = recording();
    const rotated = { authJson: '{"tokens":{"refresh_token":"new"}}' };

    await capture(driverReturning(Option.some(rotated)), credentials);

    expect(written).toEqual([rotated]);
  });

  it("writes nothing when the harness reported no rotation", async () => {
    const { credentials, written } = recording();

    await capture(driverReturning(Option.none()), credentials);

    expect(written).toEqual([]);
  });

  it("writes nothing for a driver that cannot rotate", async () => {
    const { credentials, written } = recording();
    const driver: HarnessDriverShape = {
      harness: "claude",
      prepare: () => Effect.succeed({}),
      run: () => Effect.die("unused"),
    };

    await capture(driver, credentials);

    expect(written).toEqual([]);
  });

  /* A credential that cannot be written back must not fail the trial: the run
     itself is still valid, and only the next one is worse off. */
  it("survives a store that refuses the write", async () => {
    const credentials: CredentialResolverShape = {
      persist: () => Effect.die("store down"),
      resolve: () => Effect.die("unused"),
      resolveBound: () => Effect.die("unused"),
    };

    const result = await capture(
      driverReturning(Option.some({ authJson: "{}" })),
      credentials
    );

    expect(result).toBeUndefined();
  });
});
