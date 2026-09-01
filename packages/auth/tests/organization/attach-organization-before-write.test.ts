import { describe, expect, test } from "bun:test";
import { Effect, Option } from "effect";
import { attachOrganizationBeforeWrite } from "../../src/organization/attach-organization-before-write";
import type { OrganizationStoreShape } from "../../src/organization/organization-store";

const store = (calls: string[]): OrganizationStoreShape => ({
  existingActive: (userId) =>
    Effect.sync(() => {
      calls.push(`existingActive:${userId}`);
      return Option.none<string>();
    }),
  resolveActive: (userId) =>
    Effect.sync(() => {
      calls.push(`resolveActive:${userId}`);
      return Option.some("org_provisioned");
    }),
  roleOf: () => Effect.succeedNone,
});

describe("attachOrganizationBeforeWrite", () => {
  test("signing in resolves, which may provision a first organisation", async () => {
    const calls: string[] = [];

    const written = await attachOrganizationBeforeWrite(store(calls))({
      userId: "user_1",
    });

    expect(calls).toEqual(["resolveActive:user_1"]);
    expect(written?.data.activeOrganizationId).toBe("org_provisioned");
  });

  test("impersonating reads instead, so it creates nothing", async () => {
    const calls: string[] = [];

    const written = await attachOrganizationBeforeWrite(store(calls))({
      impersonatedBy: "user_staff",
      userId: "user_1",
    });

    expect(calls).toEqual(["existingActive:user_1"]);
    expect(written).toBeUndefined();
  });

  test("a failed lookup leaves the session without an organisation", async () => {
    const failing: OrganizationStoreShape = {
      existingActive: () => Effect.die("unreachable"),
      resolveActive: () => Effect.die("unreachable"),
      roleOf: () => Effect.succeedNone,
    };

    expect(
      await attachOrganizationBeforeWrite(failing)({ userId: "user_1" })
    ).toBeUndefined();
  });
});
