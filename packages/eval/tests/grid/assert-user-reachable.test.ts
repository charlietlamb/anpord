import { expect, test } from "bun:test";
import { Effect } from "effect";
import { connectionNotFound } from "../../src/credentials/errors";
import type { CredentialResolverShape } from "../../src/credentials/resolver";
import { assertUserReachable } from "../../src/grid/assert-user-reachable";

const unconnected: CredentialResolverShape = {
  persist: () => Effect.void,
  resolve: () => Effect.fail(connectionNotFound()),
  resolveBound: () => Effect.fail(connectionNotFound()),
};

const grid = (user: unknown) =>
  ({ cases: [{ user }], organizationId: "org_x" }) as never;

test("refuses a run whose human has nobody to play them", async () => {
  const exit = await Effect.runPromiseExit(
    assertUserReachable(unconnected, grid({ kind: "simulated" }))
  );

  expect(exit._tag).toBe("Failure");
});

test("a scripted user needs no credential", async () => {
  const exit = await Effect.runPromiseExit(
    assertUserReachable(unconnected, grid({ kind: "scripted" }))
  );

  expect(exit._tag).toBe("Success");
});

test("a case with no conversation needs no credential", async () => {
  const exit = await Effect.runPromiseExit(
    assertUserReachable(unconnected, grid(undefined))
  );

  expect(exit._tag).toBe("Success");
});
