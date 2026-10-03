import { describe, expect, it } from "bun:test";
import { profileEnv } from "../../src/services/profile-env";

describe("where forwarded values sit", () => {
  it("reaches a task that declared no profile", () => {
    const env = profileEnv({
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
      driverEnv: { SHARED: "driver" },
      forwarded: { SHARED: "forwarded" },
      home: "/home",
      model: "m",
      profile: null,
      workspace: "/w",
    });

    expect(env.SHARED).toBe("forwarded");
  });

  it("yields to a profile that set the same variable literally", () => {
    const env = profileEnv({
      driverEnv: {},
      forwarded: { SHARED: "forwarded" },
      home: "/home",
      model: "m",
      profile: { env: { SHARED: "profile" } } as never,
      workspace: "/w",
    });

    expect(env.SHARED).toBe("profile");
  });

  it("names the sandbox paths for a profile's process", () => {
    const env = profileEnv({
      driverEnv: {},
      forwarded: { SEARCH_API_KEY: "named" },
      home: "/home",
      model: "gpt-6",
      profile: { env: null } as never,
      workspace: "/w",
    });

    expect(env).toEqual({
      SEARCH_API_KEY: "named",
      SPHYNX_HOME: "/home",
      SPHYNX_MODEL: "gpt-6",
      SPHYNX_WORKSPACE: "/w",
    });
  });
});
