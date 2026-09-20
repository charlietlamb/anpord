import { describe, expect, it } from "bun:test";
import { Redacted } from "effect";
import { profileEnv } from "../../src/services/profile-env";

const credential = (values: Readonly<Record<string, string>>) =>
  Redacted.make({
    authMethodId: "env",
    connectionId: "c",
    integrationId: "env",
    revision: 1,
    values,
  } as never);

describe("where forwarded values sit", () => {
  it("reaches a task that declared no profile", () => {
    const env = profileEnv({
      credential: credential({}),
      driverEnv: { DRIVER: "yes" },
      forwarded: { API_BASE: "http://localhost:3005" },
      home: "/home",
      model: "m",
      profile: null,
      workspace: "/w",
    });

    expect(env).toEqual({
      API_BASE: "http://localhost:3005",
      DRIVER: "yes",
    });
  });

  it("overrides what a driver's prepare set", () => {
    const env = profileEnv({
      credential: credential({}),
      driverEnv: { SHARED: "driver" },
      forwarded: { SHARED: "forwarded" },
      home: "/home",
      model: "m",
      profile: null,
      workspace: "/w",
    });

    expect(env.SHARED).toBe("forwarded");
  });

  /* An eval that names a variable is describing what it needs, which is a
     stronger statement than what happened to be set on the machine. */
  it("yields to a profile that named the same variable", () => {
    const env = profileEnv({
      credential: credential({}),
      driverEnv: {},
      forwarded: { SHARED: "forwarded" },
      home: "/home",
      model: "m",
      profile: { env: { SHARED: "profile" } } as never,
      workspace: "/w",
    });

    expect(env.SHARED).toBe("profile");
  });

  it("yields to the credential the run was bound to", () => {
    const env = profileEnv({
      credential: credential({ SHARED: "credential" }),
      driverEnv: {},
      forwarded: { SHARED: "forwarded" },
      home: "/home",
      model: "m",
      profile: { env: {} } as never,
      workspace: "/w",
    });

    expect(env.SHARED).toBe("credential");
  });
});
