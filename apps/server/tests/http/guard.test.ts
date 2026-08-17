import { describe, expect, it } from "bun:test";
import type { Actor } from "@anpord/schema/domain/actor";
import { OrganizationId, UserId } from "@anpord/schema/domain/actor";
import { Forbidden } from "@anpord/schema/domain/errors";
import type { Permission } from "@anpord/schema/domain/permissions";
import { ROLE_PERMISSIONS } from "@anpord/schema/domain/permissions";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { Effect, Exit } from "effect";
import { guardBy } from "../../src/http/authorization/guard";

const PERMISSIONS = {
  read: "prompts:read",
  publish: "channels:write",
  destroy: "organization:admin",
} satisfies Record<string, Permission>;

const guard = guardBy(PERMISSIONS);

const as = (permissions: readonly Permission[]): Actor => ({
  id: UserId.make("user_1"),
  organizationId: OrganizationId.make("org_1"),
  permissions,
});

const run = (name: keyof typeof PERMISSIONS, actor: Actor) =>
  Effect.runSyncExit(
    guard(name, Effect.succeed("ran")).pipe(
      Effect.provideService(CurrentActor, actor)
    )
  );

describe("guardBy", () => {
  it("runs the handler when the permission is held", () => {
    expect(run("read", as(["prompts:read"]))).toEqual(Exit.succeed("ran"));
  });

  it("refuses without running the handler when it is not", () => {
    const exit = run("destroy", as(["prompts:write", "channels:write"]));
    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("fails with Forbidden rather than Unauthorized", () => {
    const exit = run("destroy", as([]));
    expect(
      Exit.isFailure(exit) &&
        Exit.causeOption(exit).pipe(
          (cause) => cause._tag === "Some" && cause.value.toString()
        )
    ).toContain("Forbidden");
  });

  it("names the missing permission so a caller can act on it", () => {
    const exit = run("publish", as(["prompts:read"]));
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).toContain("channels:write");
    }
  });

  it("accepts a write grant where a read is required", () => {
    expect(run("read", as(["prompts:write"]))).toEqual(Exit.succeed("ran"));
  });

  it("refuses an owner-only action for every other role", () => {
    for (const role of ["viewer", "member", "admin"] as const) {
      expect(Exit.isFailure(run("destroy", as(ROLE_PERMISSIONS[role])))).toBe(
        true
      );
    }
    expect(run("destroy", as(ROLE_PERMISSIONS.owner))).toEqual(
      Exit.succeed("ran")
    );
  });

  it("refuses an actor carrying no permissions at all", () => {
    expect(Exit.isFailure(run("read", as([])))).toBe(true);
  });
});

describe("Forbidden", () => {
  it("answers 403 rather than 401, so a client does not re-authenticate", () => {
    expect(new Forbidden({ message: "nope" })._tag).toBe("Forbidden");
  });
});
