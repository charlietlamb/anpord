import { describe, expect, it } from "bun:test";
import type { CredentialConnection } from "@anpord/schema/domain/credentials";
import { DateTime } from "effect";
import {
  missingCredentialIntegrations,
  normalizeCredentialSelections,
  requiredCredentialIntegrations,
} from "./credential-selection";

const connection = (
  id: string,
  integrationId: string,
  isDefault = false,
  status: "active" | "invalid" = "active"
): CredentialConnection => ({
  authMethodId: "api-key",
  createdAt: DateTime.unsafeMake(0),
  id,
  integrationId,
  isDefault,
  lastUsedAt: null,
  lastVerifiedAt: null,
  name: id,
  scope: "organization",
  status,
});

describe("eval credential selections", () => {
  it("requires each distinct harness and hosted sandbox", () => {
    expect(
      requiredCredentialIntegrations(
        [
          { harness: "codex", model: "a" },
          { harness: "codex", model: "b" },
          { harness: "claude", model: "c" },
        ],
        ["daytona", "e2b"]
      )
    ).toEqual(["codex", "claude", "daytona", "e2b"]);
  });

  it("keeps valid choices and fills defaults", () => {
    const connections = [
      connection("codex-a", "codex"),
      connection("codex-b", "codex", true),
      connection("daytona-a", "daytona"),
    ];

    expect(
      normalizeCredentialSelections(["codex", "daytona"], connections, {
        codex: "codex-a",
      })
    ).toEqual({ codex: "codex-a", daytona: "daytona-a" });
  });

  it("prefers a personal default", () => {
    expect(
      normalizeCredentialSelections(
        ["codex"],
        [
          connection("organization", "codex", true),
          { ...connection("personal", "codex", true), scope: "personal" },
        ],
        {}
      )
    ).toEqual({ codex: "personal" });
  });

  it("reports removed and invalid connections", () => {
    expect(
      missingCredentialIntegrations(
        ["codex", "daytona"],
        [
          connection("codex-a", "codex"),
          connection("bad", "daytona", true, "invalid"),
        ],
        { codex: "removed", daytona: "bad" }
      )
    ).toEqual(["codex", "daytona"]);
  });
});
