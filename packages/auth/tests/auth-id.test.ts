import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { authId } from "../src/organization/auth-id";

const AUTH_ID = /^[a-zA-Z0-9]{32}$/;

const generate = (count: number) =>
  Effect.runSync(Effect.all(Array.from({ length: count }, () => authId)));

describe("ids for tables Better Auth owns", () => {
  /* Its plugins write these rows too, and an org created through
     `createOrganization` must not be a different shape from one provisioned
     at signup. */
  it("matches Better Auth's own shape", () => {
    for (const id of generate(20)) {
      expect(id).toMatch(AUTH_ID);
    }
  });

  it("does not repeat itself", () => {
    const ids = generate(2000);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
