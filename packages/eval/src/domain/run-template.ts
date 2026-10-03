import { Option } from "effect";
import type { HarnessName, SandboxName } from "./variant";
import { namesOf } from "./variant";

export interface RunTemplate {
  readonly harness: HarnessName;
  readonly harnessCredentialRef: string | null;
  readonly harnessVersion: string;
  readonly profileInternalId: string | null;
  readonly sandbox: SandboxName;
  readonly sandboxCredentialRef: string | null;
  readonly variantInternalId: string;
}

interface RunTemplateRow {
  readonly run: {
    readonly harnessCredentialRef: string | null;
    readonly harnessVersion: string;
    readonly profileInternalId: string | null;
    readonly sandboxCredentialRef: string | null;
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
    harnessCredentialRef: row.run.harnessCredentialRef,
    harnessVersion: row.run.harnessVersion,
    profileInternalId: row.run.profileInternalId,
    sandbox: names.sandbox,
    sandboxCredentialRef: row.run.sandboxCredentialRef,
    variantInternalId: row.variant.internalId,
  }));
