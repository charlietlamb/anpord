import { describe, expect, it } from "bun:test";
import {
  grants,
  permissionsForPlatformRole,
  permissionsForRole,
  ROLE_PERMISSIONS,
} from "../../src/domain/permissions";

describe("grants", () => {
  it("allows a permission that is held outright", () => {
    expect(grants(["prompts:read"], "prompts:read")).toBe(true);
  });

  it("refuses a permission that is not held", () => {
    expect(grants(["prompts:read"], "prompts:write")).toBe(false);
  });

  it("reads write as covering read on the same resource", () => {
    expect(grants(["prompts:write"], "prompts:read")).toBe(true);
  });

  it("keeps the implication within one resource", () => {
    expect(grants(["prompts:write"], "channels:read")).toBe(false);
  });

  it("refuses everything when nothing is held", () => {
    expect(grants([], "prompts:read")).toBe(false);
  });

  it("never lets a resource permission stand in for admin", () => {
    expect(
      grants(["prompts:write", "channels:write"], "organization:admin")
    ).toBe(false);
  });
});

describe("permissionsForRole", () => {
  it("grants nothing for a role it does not recognise", () => {
    expect(permissionsForRole("auditor")).toEqual([]);
  });

  it("reserves administration for the owner", () => {
    for (const role of ["viewer", "member", "admin"] as const) {
      expect(grants(ROLE_PERMISSIONS[role], "organization:admin")).toBe(false);
    }
    expect(grants(ROLE_PERMISSIONS.owner, "organization:admin")).toBe(true);
  });

  it("lets a viewer read but never write", () => {
    expect(grants(ROLE_PERMISSIONS.viewer, "prompts:read")).toBe(true);
    expect(grants(ROLE_PERMISSIONS.viewer, "prompts:write")).toBe(false);
    expect(grants(ROLE_PERMISSIONS.viewer, "channels:write")).toBe(false);
  });

  it("lets a member author and publish without managing keys", () => {
    expect(grants(ROLE_PERMISSIONS.member, "prompts:write")).toBe(true);
    expect(grants(ROLE_PERMISSIONS.member, "channels:write")).toBe(true);
    expect(grants(ROLE_PERMISSIONS.member, "apiKeys:read")).toBe(false);
  });

  it("lets an admin manage keys and members", () => {
    expect(grants(ROLE_PERMISSIONS.admin, "apiKeys:write")).toBe(true);
    expect(grants(ROLE_PERMISSIONS.admin, "members:write")).toBe(true);
  });
});

describe("permissionsForPlatformRole", () => {
  it("grants nothing for a role it does not recognise", () => {
    for (const role of [null, undefined, "", "owner", "Admin", "admin "]) {
      expect(permissionsForPlatformRole(role)).toEqual([]);
    }
  });

  it("reserves impersonation for the platform admin", () => {
    expect(
      grants(permissionsForPlatformRole("admin"), "platform:impersonate")
    ).toBe(true);
    expect(
      grants(permissionsForPlatformRole("user"), "platform:impersonate")
    ).toBe(false);
  });

  it("never lets an organisation role stand in for impersonation", () => {
    for (const permissions of Object.values(ROLE_PERMISSIONS)) {
      expect(grants(permissions, "platform:impersonate")).toBe(false);
    }
  });

  it("grants nothing inside an organisation", () => {
    const staff = permissionsForPlatformRole("admin");

    expect(grants(staff, "prompts:read")).toBe(false);
    expect(grants(staff, "organization:admin")).toBe(false);
  });

  it("leaves an impersonated owner unable to impersonate in turn", () => {
    const acting = [
      ...permissionsForRole("owner"),
      ...permissionsForPlatformRole(null),
    ];

    expect(grants(acting, "organization:admin")).toBe(true);
    expect(grants(acting, "platform:impersonate")).toBe(false);
  });
});
