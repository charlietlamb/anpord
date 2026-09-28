import { Option } from "effect";
import type { HarnessName, SandboxName } from "./variant";
import { namesOf } from "./variant";

export interface RunTemplate {
  readonly harness: HarnessName;
  readonly harnessCredentialConnectionId: string | null;
  readonly harnessVersion: string;
  readonly profileInternalId: string | null;
  readonly sandbox: SandboxName;
  readonly sandboxCredentialConnectionId: string | null;
  readonly variantInternalId: string;
}

interface RunTemplateRow {
  readonly run: {
    readonly harnessCredentialConnectionId: string | null;
    readonly harnessVersion: string;
    readonly profileInternalId: string | null;
    readonly sandboxCredentialConnectionId: string | null;
  };
  readonly variant: {
    readonly harness: string;
    readonly internalId: string;
    readonly sandbox: string;
  };
}

export const templateOf = (row: RunTemplateRow): Option.Option<RunTemplate> =>
  Option.map(namesOf(row.variant), (names) => ({
    harness: names.harness,
    harnessCredentialConnectionId: row.run.harnessCredentialConnectionId,
    harnessVersion: row.run.harnessVersion,
    profileInternalId: row.run.profileInternalId,
    sandbox: names.sandbox,
    sandboxCredentialConnectionId: row.run.sandboxCredentialConnectionId,
    variantInternalId: row.variant.internalId,
  }));
