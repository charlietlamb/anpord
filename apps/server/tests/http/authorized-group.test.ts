import { describe, expect, it } from "bun:test";
import type { Actor } from "@anpord/schema/domain/actor";
import { OrganizationId, UserId } from "@anpord/schema/domain/actor";
import type { Permission } from "@anpord/schema/domain/permissions";
import { ROLE_PERMISSIONS } from "@anpord/schema/domain/permissions";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { Effect, Exit } from "effect";
import { authorized } from "../../src/http/authorization/authorized-group";

interface Registered {
  handle: (
    name: string,
    options: { permission: Permission },
    handler: unknown
  ) => Registered;
}

/** The wrapper is typed against the real builder, so a stand-in has to be
 * named as one for the test to reach it. */
const asBuilder = (group: unknown) =>
  authorized(group as never) as unknown as Registered;

const as = (permissions: readonly Permission[]): Actor => ({
  id: UserId.make("user_1"),
  organizationId: OrganizationId.make("org_1"),
  permissions,
});

/** Stands in for the builder so a test can run the handler the wrapper
 * registered, rather than the one the group declared. */
const collector = () => {
  const registered = new Map<
    string,
    () => Effect.Effect<string, unknown, never>
  >();
  const self = {
    handle(name: string, handler: () => Effect.Effect<string, unknown, never>) {
      registered.set(name, handler);
      return self;
    },
    registered,
  };
  return self;
};

const run = (
  permission: Permission,
  actor: Actor,
  onRun: () => void = () => {
    // only meaningful when the body is reached
  }
) => {
  const group = collector();
  asBuilder(group).handle("endpoint", { permission }, (() =>
    Effect.sync(() => {
      onRun();
      return "ran";
    })) as never);

  const handler = group.registered.get("endpoint");
  if (!handler) {
    throw new Error("the wrapper never registered the handler");
  }

  return Effect.runSyncExit(
    handler().pipe(Effect.provideService(CurrentActor, actor))
  );
};

describe("authorized", () => {
  it("registers the handler under its own name", () => {
    const group = collector();
    asBuilder(group).handle("list", { permission: "prompts:read" }, (() =>
      Effect.succeed("ran")) as never);
    expect([...group.registered.keys()]).toEqual(["list"]);
  });

  it("runs the handler when the permission is held", () => {
    expect(run("prompts:read", as(["prompts:read"]))).toEqual(
      Exit.succeed("ran")
    );
  });

  it("refuses when it is not", () => {
    expect(
      Exit.isFailure(run("organization:admin", as(["prompts:write"])))
    ).toBe(true);
  });

  /** The reason the check wraps the handler rather than sitting inside it: a
   * refusal must never reach the service. */
  it("never enters the body of a refused handler", () => {
    let entered = false;
    run("organization:admin", as([]), () => {
      entered = true;
    });
    expect(entered).toBe(false);
  });

  it("names the permission the caller lacks", () => {
    const exit = run("channels:write", as(["prompts:read"]));
    expect(String(Exit.isFailure(exit) && exit.cause)).toContain(
      "channels:write"
    );
  });

  it("answers Forbidden rather than Unauthorized", () => {
    const exit = run("organization:admin", as([]));
    expect(String(Exit.isFailure(exit) && exit.cause)).toContain("Forbidden");
  });

  it("accepts a write grant where a read is required", () => {
    expect(run("prompts:read", as(["prompts:write"]))).toEqual(
      Exit.succeed("ran")
    );
  });

  it("keeps administration to the owner", () => {
    for (const role of ["viewer", "member", "admin"] as const) {
      expect(
        Exit.isFailure(run("organization:admin", as(ROLE_PERMISSIONS[role])))
      ).toBe(true);
    }
    expect(run("organization:admin", as(ROLE_PERMISSIONS.owner))).toEqual(
      Exit.succeed("ran")
    );
  });

  it("refuses an actor carrying nothing", () => {
    expect(Exit.isFailure(run("prompts:read", as([])))).toBe(true);
  });
});
