import { describe, expect, it } from "bun:test";
import { ConfigProvider, Effect, Exit } from "effect";
import { makeLocalAdapter } from "../../../src/adapters/sandbox/local";

const withEnv = (entries: Readonly<Record<string, string>>) =>
  Effect.withConfigProvider(
    ConfigProvider.fromMap(new Map(Object.entries(entries)))
  );

const openOne = (entries: Readonly<Record<string, string>>) =>
  makeLocalAdapter.pipe(
    Effect.flatMap((adapter) =>
      adapter.open({
        autoStopMinutes: 1,
        provider: "local",
        workspace: "/tmp/anpord-gate",
      })
    ),
    withEnv(entries),
    Effect.exit,
    Effect.runPromise
  );

/* The one thing about this provider that must never regress: a deployment that
   did not ask for a shell on its own machine does not get one. */
describe("the local sandbox gate", () => {
  it("refuses to open when nothing opted in", async () => {
    const exit = await openOne({});

    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("refuses to open when the opt-in is off", async () => {
    const exit = await openOne({ ANPORD_LOCAL_SANDBOX: "false" });

    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("says why it refused rather than failing blankly", async () => {
    const exit = await openOne({});

    const reason = Exit.isFailure(exit)
      ? JSON.stringify(exit.cause)
      : "it opened";

    expect(reason).toContain("ANPORD_LOCAL_SANDBOX");
  });

  it("reports itself rather than standing in for a cloud provider", async () => {
    const adapter = await makeLocalAdapter.pipe(withEnv({}), Effect.runPromise);

    expect(adapter.provider).toBe("local");
  });
});
