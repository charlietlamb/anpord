import { expect, test } from "bun:test";
import { Data, Effect, Option } from "effect";
import { makeRoleCache } from "../../../src/http/authentication/session-authentication";

test("role cache shares a lookup across equal actor keys", async () => {
  let calls = 0;
  const cache = await Effect.runPromise(
    makeRoleCache({
      roleOf: () =>
        Effect.sync(() => {
          calls += 1;
          return Option.some("owner");
        }),
    })
  );
  const key = { organizationId: "org", userId: "user" };

  await Effect.runPromise(cache.get(Data.struct(key)));
  await Effect.runPromise(cache.get(Data.struct(key)));

  expect(calls).toBe(1);
});
